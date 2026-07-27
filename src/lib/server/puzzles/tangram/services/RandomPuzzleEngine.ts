import TangramPuzzle from "@/lib/server/models/TangramPuzzle"
import type { TangramDifficulty } from "../types"

interface SelectRandomOptions {
  userId: string
  difficulty?: TangramDifficulty
  excludeCompleted?: boolean
  excludeActive?: boolean
  excludeRecentAbandons?: boolean
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

    const matchFilter: any = { game: "tangram", isActive: true }
    if (difficulty) matchFilter.difficulty = difficulty

    const excludeIds: string[] = []

    if (excludeCompleted) {
      const completed = await TangramPlaySession.find({
        userId,
        status: "completed",
      }).distinct("puzzleId")
      excludeIds.push(...completed.map(id => id.toString()))
    }

    if (excludeActive) {
      const active = await TangramPlaySession.find({
        userId,
        status: { $in: ["playing", "paused"] },
      }).distinct("puzzleId")
      excludeIds.push(...active.map(id => id.toString()))
    }

    if (excludeRecentAbandons) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const recentAbandons = await TangramPlaySession.find({
        userId,
        status: "abandoned",
        lastSaveAt: { $gte: twentyFourHoursAgo },
      }).distinct("puzzleId")
      excludeIds.push(...recentAbandons.map(id => id.toString()))
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
      const fallbackMatch: any = { game: "tangram", isActive: true }
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

  async selectDailyPuzzle(dateStr: string, difficulty?: TangramDifficulty) {
    const matchFilter: Record<string, any> = { game: "tangram", dailyIndex: { $exists: true } }
    if (difficulty) matchFilter.difficulty = difficulty

    const allPuzzles = await TangramPuzzle.find(matchFilter)
      .sort({ dailyIndex: 1 })
      .lean()

    if (allPuzzles.length === 0) throw new Error("no_daily_puzzles_available")

    const dayOfYear = this.getDayOfYear(new Date(dateStr))
    const puzzleIndex = dayOfYear % allPuzzles.length
    return allPuzzles[puzzleIndex]
  }

  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0)
    return Math.floor((date.getTime() - start.getTime()) / 86400000)
  }
}

export const randomPuzzleEngine = new RandomPuzzleEngine()