import CrossMathPuzzle from "@/lib/server/models/CrossMathPuzzle"
import CrossMathPlaySession from "@/lib/server/models/CrossMathPlaySession"
import { getPatternById } from "@shared/data/crossmath/patterns"

interface SelectRandomOptions {
  userId: string
  difficulty?: "easy" | "medium" | "hard"
  excludeCompleted?: boolean
  excludeActive?: boolean
  excludeRecentAbandons?: boolean
}

interface SelectPuzzleForPlayerOptions {
  userId: string
  difficulty?: "easy" | "medium" | "hard"
  patternId?: number
}

export class RandomPuzzleEngine {
async selectRandom(options: SelectRandomOptions, page = 1, pageSize = 20, shapeName?: string) {
    const {
      userId,
      difficulty,
      excludeCompleted = true,
      excludeActive = true,
      excludeRecentAbandons = true,
    } = options

    const matchFilter: Record<string, any> = { game: "crossmath" }
    if (difficulty) matchFilter.difficulty = difficulty

    const excludeIds: string[] = []

    if (excludeCompleted) {
      const completed = await CrossMathPlaySession.find({
        userId,
        status: "completed",
      }).distinct("puzzleId")
      excludeIds.push(...completed.map(id => id.toString()))
    }

    if (excludeActive) {
      const active = await CrossMathPlaySession.find({
        userId,
        status: { $in: ["active", "paused"] },
      }).distinct("puzzleId")
      excludeIds.push(...active.map(id => id.toString()))
    }

    if (excludeRecentAbandons) {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const recentAbandons = await CrossMathPlaySession.find({
        userId,
        status: "abandoned",
        lastSaveAt: { $gte: twentyFourHoursAgo },
      }).distinct("puzzleId")
      excludeIds.push(...recentAbandons.map(id => id.toString()))
    }

    if (excludeIds.length > 0) {
      matchFilter.puzzleId = { $nin: [...new Set(excludeIds)] }
    }

    const skip = (page - 1) * pageSize

    const pipeline: any[] = [
      { $match: matchFilter },
      { $sort: { puzzleId: 1 } },
      { $skip: skip },
      { $limit: pageSize },
    ]

    const puzzles = await CrossMathPuzzle.aggregate(pipeline)

    const totalCount = await CrossMathPuzzle.countDocuments(matchFilter)

    const enriched = puzzles.map(doc => {
      const pattern = getPatternById(doc.patternId)
      const shapeName = pattern ? pattern.shape_name : null
      const gridRows = pattern ? pattern.grid_rows : 0
      const gridCols = pattern ? pattern.grid_cols : 0
      const blanks = doc.blanks || []
      const maxMistakes = doc.maxMistakes || 3
      const solution = doc.solution || {}

      return {
        id: doc.puzzleId,
        game: doc.game || "crossmath",
        difficulty: doc.difficulty,
        patternId: doc.patternId,
        patternShape: shapeName,
        patternSize: `${gridRows}x${gridCols}`,
        blanksCount: blanks.length,
        maxMistakes,
        totalNumbers: Object.keys(solution).length,
        availableNumbers: doc.availableNumbers || [],
        solution,
        blinkerPreview: blanks.slice(0, 5),
      }
    })

    return {
      puzzles: enriched,
      pagination: {
        page,
        pageSize,
        total: Math.ceil(totalCount / pageSize),
        totalCount,
      },
    }
  }

  async selectPuzzleForPlayer(options: SelectPuzzleForPlayerOptions) {
    const { userId, difficulty, patternId } = options

    const matchFilter: Record<string, any> = { game: "crossmath" }
    if (difficulty) matchFilter.difficulty = difficulty
    if (patternId !== undefined) matchFilter.patternId = patternId

    let played: string[] = []
    try {
      played = await CrossMathPlaySession.find({
        userId,
        status: { $in: ["completed", "active", "paused"] },
      }).distinct("puzzleId")
    } catch (e: any) {
      if (e.name !== "CastError") throw e
    }

    if (played.length > 0) {
      matchFilter.puzzleId = { $nin: [...new Set(played.map(id => id.toString()))] }
    }

    const [doc] = await CrossMathPuzzle.aggregate([
      { $match: matchFilter },
      { $sample: { size: 1 } },
    ])

    if (!doc) throw new Error("no_puzzles_available")

    const pattern = getPatternById(doc.patternId)
    return {
      id: doc.puzzleId,
      game: doc.game || "crossmath",
      difficulty: doc.difficulty,
      patternId: doc.patternId,
      patternName: pattern ? pattern.shape_name : null,
      patternSize: pattern ? `${pattern.grid_rows}x${pattern.grid_cols}` : "0x0",
      rows: pattern?.grid_rows || 0,
      columns: pattern?.grid_cols || 0,
      blanks: doc.blanks || [],
      availableNumbers: doc.availableNumbers || [],
      maxMistakes: doc.maxMistakes || 3,
      solution: doc.solution || {},
    }
  }

  async selectPuzzleById(puzzleId: string) {
    const doc = await CrossMathPuzzle.findOne({ puzzleId }).lean()
    if (!doc) throw new Error("puzzle_not_found")
    const pattern = getPatternById(doc.patternId)
    return {
      id: doc.puzzleId,
      game: doc.game || "crossmath",
      difficulty: doc.difficulty,
      patternId: doc.patternId,
      patternName: pattern ? pattern.shape_name : null,
      patternSize: pattern ? `${pattern.grid_rows}x${pattern.grid_cols}` : "0x0",
      blanks: doc.blanks || [],
      availableNumbers: doc.availableNumbers || [],
      maxMistakes: doc.maxMistakes || 3,
      solution: doc.solution || {},
      _id: doc._id,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }
  }

  async selectDailyPuzzle(dateStr: string, difficulty?: "easy" | "medium" | "hard") {
    const matchFilter: Record<string, any> = { game: "crossmath", dailyIndex: { $exists: true } }
    if (difficulty) matchFilter.difficulty = difficulty

    const allPuzzles = await CrossMathPuzzle.find(matchFilter)
      .sort({ dailyIndex: 1 })
      .lean()

    if (allPuzzles.length === 0) throw new Error("no_daily_puzzles_available")

    const dayOfYear = this.getDayOfYear(new Date(dateStr))
    const puzzleIndex = dayOfYear % allPuzzles.length
    const puzzle = allPuzzles[puzzleIndex]

    const pattern = getPatternById(puzzle.patternId)
    return {
      id: puzzle.puzzleId,
      game: puzzle.game || "crossmath",
      difficulty: puzzle.difficulty,
      patternId: puzzle.patternId,
      patternName: pattern ? pattern.shape_name : null,
      patternSize: pattern ? `${pattern.grid_rows}x${pattern.grid_cols}` : "0x0",
      blanks: puzzle.blanks || [],
      availableNumbers: puzzle.availableNumbers || [],
      maxMistakes: puzzle.maxMistakes || 3,
      solution: puzzle.solution || {},
      dailyIndex: puzzle.dailyIndex,
    }
  }

  private getDayOfYear(date: Date): number {
    const start = new Date(date.getFullYear(), 0, 0)
    return Math.floor((date.getTime() - start.getTime()) / 86400000)
  }
}

export const randomPuzzleEngine = new RandomPuzzleEngine()
