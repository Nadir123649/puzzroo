import NonogramPuzzle from "@/lib/server/models/NonogramPuzzle"
import NonogramPlaySession from "@/lib/server/models/NonogramPlaySession"
import type { NonogramDifficulty } from "../types"

interface SelectRandomOptions {
  userId: string
  difficulty?: NonogramDifficulty
  excludeCompleted?: boolean
  excludeActive?: boolean
  excludeRecentAbandons?: boolean
}

export class RandomPuzzleEngine {
  async selectDailyPuzzle(dateStr: string, difficulty?: NonogramDifficulty) {
    const matchFilter: Record<string, any> = { game: "nonogram", dailyIndex: { $exists: true } }
    if (difficulty) matchFilter.difficulty = difficulty

    const allPuzzles = await NonogramPuzzle.find(matchFilter)
      .sort({ dailyIndex: 1 })
      .lean()

    if (allPuzzles.length === 0) throw new Error("no_daily_puzzles_available")

    const dayOfYear = this.getDayOfYear(new Date(dateStr))
    const puzzleIndex = dayOfYear % allPuzzles.length
    return allPuzzles[puzzleIndex]
  }

  async selectRandom(options: SelectRandomOptions) {
    const {
      userId,
      difficulty,
      excludeCompleted = true,
      excludeActive = true,
      excludeRecentAbandons = true,
    } = options

    const matchFilter: any = { game: "nonogram", isActive: true }
    if (difficulty) matchFilter.difficulty = difficulty

    const excludeIds: string[] = []

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const distinctPromises: Promise<any[]>[] = []
    if (excludeCompleted) {
      distinctPromises.push(
        NonogramPlaySession.find({ userId, status: "completed" }).distinct("puzzleId")
      )
    }
    if (excludeActive) {
      distinctPromises.push(
        NonogramPlaySession.find({ userId, status: { $in: ["playing", "paused"] } }).distinct("puzzleId")
      )
    }
    if (excludeRecentAbandons) {
      distinctPromises.push(
        NonogramPlaySession.find({ userId, status: "abandoned", lastSaveAt: { $gte: twentyFourHoursAgo } }).distinct("puzzleId")
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
  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0)
    return Math.floor((date.getTime() - start.getTime()) / 86400000)
  }
}

export const randomPuzzleEngine = new RandomPuzzleEngine()
