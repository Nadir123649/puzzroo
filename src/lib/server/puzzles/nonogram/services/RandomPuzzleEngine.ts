import NonogramPuzzle from "@/lib/server/models/NonogramPuzzle"
import NonogramPlaySession from "@/lib/server/models/NonogramPlaySession"
import type { NonogramDifficulty } from "../types"

interface SelectRandomOptions {
  userId?: string
  guestId?: string
  difficulty?: NonogramDifficulty
  excludeCompleted?: boolean
  excludeActive?: boolean
  excludeRecentAbandons?: boolean
}

function ownerFilter(options: SelectRandomOptions): Record<string, unknown> {
  return options.guestId ? { guestId: options.guestId } : { userId: options.userId }
}

export class RandomPuzzleEngine {
  async selectDailyPuzzle(dateStr: string, difficulty?: NonogramDifficulty) {
    const matchFilter: Record<string, any> = { game: "nonogram", isActive: true }
    if (difficulty) matchFilter.difficulty = difficulty

    let allPuzzles = await NonogramPuzzle.find(matchFilter)
      .sort({ dailyIndex: 1, puzzleId: 1 })
      .lean()

    if (allPuzzles.length === 0) {
      delete matchFilter.difficulty
      allPuzzles = await NonogramPuzzle.find({ game: "nonogram", isActive: true })
        .sort({ dailyIndex: 1, puzzleId: 1 })
        .lean()
    }

    if (allPuzzles.length === 0) throw new Error("no_daily_puzzles_available")

    let seed = 0
    if (dateStr && dateStr.includes("-")) {
      const parts = dateStr.split("-").map(Number)
      if (parts[0] > 1000) {
        // YYYY-MM-DD
        seed = parts[0] * 10000 + parts[1] * 100 + parts[2]
      } else {
        // MM-DD-YY or MM-DD-YYYY
        const y = parts[2] < 100 ? 2000 + parts[2] : parts[2]
        seed = y * 10000 + parts[0] * 100 + parts[1]
      }
    } else {
      seed = 20260805
    }

    const puzzleIndex = Math.abs(seed) % allPuzzles.length
    return allPuzzles[puzzleIndex]
  }

  async selectRandom(options: SelectRandomOptions) {
    const {
      difficulty,
      excludeCompleted = true,
      excludeActive = true,
      excludeRecentAbandons = true,
    } = options

    const matchFilter: any = { game: "nonogram", isActive: true }
    if (difficulty) matchFilter.difficulty = difficulty

    const excludeIds: string[] = []

    const owner = ownerFilter(options)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const distinctPromises: Promise<any[]>[] = []
    if (excludeCompleted) {
      distinctPromises.push(
        NonogramPlaySession.find({ ...owner, status: "completed" }).distinct("puzzleId")
      )
    }
    if (excludeActive) {
      distinctPromises.push(
        NonogramPlaySession.find({ ...owner, status: { $in: ["playing", "paused"] } }).distinct("puzzleId")
      )
    }
    if (excludeRecentAbandons) {
      distinctPromises.push(
        NonogramPlaySession.find({ ...owner, status: "abandoned", lastSaveAt: { $gte: twentyFourHoursAgo } }).distinct("puzzleId")
      )
    }

    const distinctResults = await Promise.all(distinctPromises)
    for (const ids of distinctResults) {
      for (const id of ids) excludeIds.push(id.toString())
    }

    if (excludeIds.length > 0) {
      matchFilter.puzzleId = { $nin: [...new Set(excludeIds)] }
    }

    const pipeline: any[] = [
      { $match: matchFilter },
      { $sample: { size: 1 } },
    ]

    const results = await NonogramPuzzle.aggregate(pipeline)

    if (results.length === 0) {
      const fallbackMatch: any = { game: "nonogram", isActive: true }
      if (difficulty) fallbackMatch.difficulty = difficulty
      const fallback = await NonogramPuzzle.aggregate([
        { $match: fallbackMatch },
        { $sample: { size: 1 } },
      ])
      if (fallback.length === 0) throw new Error("no_puzzles_available")
      return fallback[0]
    }

    return results[0]
  }

  async selectPuzzleForPlayer(options: { userId?: string; guestId?: string; difficulty?: NonogramDifficulty; excludeId?: string }) {
    const { difficulty, excludeId } = options

    const matchFilter: any = { game: "nonogram", isActive: true }
    if (difficulty) matchFilter.difficulty = difficulty

    const owner = ownerFilter(options)
    const sessionFilter: Record<string, any> = {
      status: { $in: ["completed", "playing", "paused"] },
      ...owner,
    }

    let played: string[] = []
    try {
      played = await NonogramPlaySession.find(sessionFilter).distinct("puzzleId")
    } catch (e: any) {
      if (e.name !== "CastError") throw e
    }

    const excludeSet = new Set(played.map(id => id.toString()))
    if (excludeId) excludeSet.add(excludeId)

    if (excludeSet.size > 0) {
      matchFilter.puzzleId = { $nin: Array.from(excludeSet) }
    }

    const [doc] = await NonogramPuzzle.aggregate([
      { $match: matchFilter },
      { $sample: { size: 1 } },
    ])

    if (!doc) {
      const fallbackMatch: any = { game: "nonogram", isActive: true }
      if (difficulty) fallbackMatch.difficulty = difficulty
      if (excludeId) fallbackMatch.puzzleId = { $ne: excludeId }
      const [fallback] = await NonogramPuzzle.aggregate([
        { $match: fallbackMatch },
        { $sample: { size: 1 } },
      ])
      if (!fallback) throw new Error("no_puzzles_available")
      return fallback
    }

    return doc
  }

  async selectPuzzleById(puzzleId: string) {
    const doc = await NonogramPuzzle.findOne({ puzzleId }).lean()
    if (!doc) throw new Error("puzzle_not_found")
    return doc
  }

  async getPuzzlesByDifficulty(difficulty?: string, cursor?: string, limit = 20) {
    const filter: Record<string, any> = { game: "nonogram", isActive: true }
    if (difficulty) filter.difficulty = difficulty
    if (cursor) filter._id = { $lt: cursor }

    return NonogramPuzzle.find(filter)
      .sort({ _id: -1 })
      .limit(limit)
      .lean()
  }

  async getCatalogSummary() {
    const difficulties = ["easy", "medium", "hard"] as const
    const byDifficulty: Record<string, number> = {}

    for (const diff of difficulties) {
      byDifficulty[diff] = await NonogramPuzzle.countDocuments({
        game: "nonogram",
        difficulty: diff,
        isActive: true,
      })
    }

    return {
      game: "nonogram",
      total: Object.values(byDifficulty).reduce((a, b) => a + b, 0),
      byDifficulty,
    }
  }
  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0)
    return Math.floor((date.getTime() - start.getTime()) / 86400000)
  }
}

export const randomPuzzleEngine = new RandomPuzzleEngine()
