import mongoose from "mongoose"
import TangramPuzzle from "@/lib/server/models/TangramPuzzle"
import TangramPlaySession from "@/lib/server/models/TangramPlaySession"
import type { TangramDifficulty } from "../types"

interface SelectRandomOptions {
  userId: string
  difficulty?: TangramDifficulty
  excludeCompleted?: boolean
  excludeActive?: boolean
  excludeRecentAbandons?: boolean
}

interface SelectPuzzleForPlayerOptions {
  userId: string
  difficulty?: TangramDifficulty
  excludeId?: string
}

export class RandomPuzzleEngine {
  async selectRandom(options: SelectRandomOptions) {
    const {
      userId,
      difficulty,
      excludeCompleted = true,
      excludeActive = true,
      excludeRecentAbandons = true,
    } = options

    const matchFilter: Record<string, any> = {
      $or: [{ active: true }, { status: "active" }, { active: { $exists: false } }],
    }
    if (difficulty) matchFilter.difficulty = difficulty

    const isObjectId = mongoose.Types.ObjectId.isValid(userId)
    const ownerField = isObjectId ? "userId" : "guestId"

    const excludeIds: string[] = []
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const distinctPromises: Promise<any[]>[] = []

    if (excludeCompleted) {
      distinctPromises.push(
        TangramPlaySession.find({ [ownerField]: userId, status: "completed" }).distinct("puzzleId")
      )
    }
    if (excludeActive) {
      distinctPromises.push(
        TangramPlaySession.find({ [ownerField]: userId, status: { $in: ["playing", "paused"] } }).distinct("puzzleId")
      )
    }
    if (excludeRecentAbandons) {
      distinctPromises.push(
        TangramPlaySession.find({ [ownerField]: userId, status: "abandoned", lastSaveAt: { $gte: twentyFourHoursAgo } }).distinct("puzzleId")
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

    const results = await TangramPuzzle.aggregate(pipeline)

    if (results.length === 0) {
      const fallbackMatch: any = {
        $or: [{ active: true }, { status: "active" }, { active: { $exists: false } }],
      }
      if (difficulty) fallbackMatch.difficulty = difficulty
      const fallback = await TangramPuzzle.aggregate([
        { $match: fallbackMatch },
        { $sample: { size: 1 } },
      ])
      if (fallback.length === 0) throw new Error("no_puzzles_available")
      return fallback[0]
    }

    return results[0]
  }

  async selectPuzzleForPlayer(options: SelectPuzzleForPlayerOptions) {
    const { userId, difficulty, excludeId } = options

    const matchFilter: Record<string, any> = {
      $or: [{ active: true }, { status: "active" }, { active: { $exists: false } }],
    }
    if (difficulty) matchFilter.difficulty = difficulty

    const isObjectId = mongoose.Types.ObjectId.isValid(userId)
    const sessionFilter: Record<string, any> = {
      status: { $in: ["completed", "playing", "paused"] },
    }
    if (isObjectId) {
      sessionFilter.userId = userId
    } else {
      sessionFilter.guestId = userId
    }

    let played: string[] = []
    try {
      played = await TangramPlaySession.find(sessionFilter).distinct("puzzleId")
    } catch (e: any) {
      if (e.name !== "CastError") throw e
    }

    const excludeSet = new Set(played.map(id => id.toString()))
    if (excludeId) excludeSet.add(excludeId)

    if (excludeSet.size > 0) {
      matchFilter.puzzleId = { $nin: Array.from(excludeSet) }
    }

    const [doc] = await TangramPuzzle.aggregate([
      { $match: matchFilter },
      { $sample: { size: 1 } },
    ])

    if (!doc) {
      // Fallback without exclusions except excludeId
      const fallbackMatch: any = {
        $or: [{ active: true }, { status: "active" }, { active: { $exists: false } }],
      }
      if (difficulty) fallbackMatch.difficulty = difficulty
      if (excludeId) fallbackMatch.puzzleId = { $ne: excludeId }
      const [fallback] = await TangramPuzzle.aggregate([
        { $match: fallbackMatch },
        { $sample: { size: 1 } },
      ])
      if (!fallback) throw new Error("no_puzzles_available")
      return fallback
    }

    return doc
  }

  async selectPuzzleById(puzzleId: string) {
    const doc = await TangramPuzzle.findOne({
      $or: [{ puzzleId }, { _id: mongoose.Types.ObjectId.isValid(puzzleId) ? puzzleId : undefined }],
    }).lean()
    if (!doc) throw new Error("puzzle_not_found")
    return doc
  }

  async selectDailyPuzzle(dateStr: string, difficulty?: TangramDifficulty) {
    const matchFilter: Record<string, any> = {
      $or: [{ active: true }, { status: "active" }, { active: { $exists: false } }],
    }
    if (difficulty) matchFilter.difficulty = difficulty

    const allPuzzles = await TangramPuzzle.find(matchFilter)
      .sort({ dailyIndex: 1, createdAt: 1 })
      .lean()

    if (allPuzzles.length === 0) throw new Error("no_daily_puzzles_available")

    const dayOfYear = this.getDayOfYear(dateStr)
    const puzzleIndex = dayOfYear % allPuzzles.length
    return allPuzzles[puzzleIndex]
  }

  async getPuzzlesByDifficulty(difficulty?: string, cursor?: string, limit = 20) {
    const filter: Record<string, any> = {
      $or: [{ active: true }, { status: "active" }, { active: { $exists: false } }],
    }
    if (difficulty) filter.difficulty = difficulty
    if (cursor) filter._id = { $lt: cursor }

    return TangramPuzzle.find(filter)
      .sort({ _id: -1 })
      .limit(limit)
      .lean()
  }

  async getCatalogSummary() {
    const difficulties = ["easy", "medium", "hard"] as const
    const byDifficulty: Record<string, number> = {}

    for (const diff of difficulties) {
      byDifficulty[diff] = await TangramPuzzle.countDocuments({
        difficulty: diff,
        $or: [{ active: true }, { status: "active" }, { active: { $exists: false } }],
      })
    }

    return {
      game: "tangram",
      total: Object.values(byDifficulty).reduce((a, b) => a + b, 0),
      byDifficulty,
    }
  }

  private getDayOfYear(dateStr: string): number {
    const parts = dateStr.split("-")
    let year = new Date().getFullYear()
    let month = 1
    let day = 1
    if (parts.length === 3) {
      year = parseInt(parts[0], 10)
      month = parseInt(parts[1], 10)
      day = parseInt(parts[2], 10)
    }
    const utcDate = Date.UTC(year, month - 1, day)
    const utcStart = Date.UTC(year, 0, 0)
    return Math.floor((utcDate - utcStart) / 86400000)
  }
}

export const randomPuzzleEngine = new RandomPuzzleEngine()