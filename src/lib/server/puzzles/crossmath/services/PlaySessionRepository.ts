import { v4 as uuidv4 } from "uuid"
import CrossMathPlaySession from "@/lib/server/models/CrossMathPlaySession"
import type { CrossMathDifficulty, SessionStatus } from "../types"

interface CreateSessionInput {
  userId?: string
  guestId?: string
  puzzleId: string
  gameType?: "crossmath" | "daily_challenge"
  dailyChallengeId?: string
  difficulty: CrossMathDifficulty
  blanks: string[]
  availableNumbers: number[]
  isReplay?: boolean
}

interface SessionQuery {
  status?: SessionStatus
  limit?: number
  skip?: number
}

export class PlaySessionRepository {
  async create(input: CreateSessionInput) {
    const doc: Record<string, unknown> = {
      sessionId: uuidv4(),
      puzzleId: input.puzzleId,
      gameType: input.gameType || "crossmath",
      difficulty: input.difficulty,
      status: "playing",
      grid: {},
      blanks: input.blanks,
      availableNumbers: input.availableNumbers,
      isReplay: input.isReplay || false,
      startedAt: new Date(),
      lastSaveAt: new Date(),
    }
    if (input.dailyChallengeId) {
      doc.dailyChallengeId = input.dailyChallengeId
    }
    if (input.guestId) {
      doc.guestId = input.guestId
    } else {
      doc.userId = input.userId
    }
    return CrossMathPlaySession.create(doc)
  }

  async findById(sessionId: string) {
    return CrossMathPlaySession.findOne({ sessionId })
  }

  async findByUserAndPuzzle(puzzleId: string, userId?: string, guestId?: string) {
    const filter: Record<string, unknown> = { puzzleId }
    if (guestId) {
      filter.guestId = guestId
    } else if (userId) {
      filter.userId = userId
    }
    return CrossMathPlaySession.findOne(filter)
  }

  async findActiveByUserAndPuzzle(puzzleId: string, userId?: string, guestId?: string) {
    const filter: Record<string, unknown> = {
      puzzleId,
      status: { $in: ["playing", "paused"] },
    }
    if (guestId) {
      filter.guestId = guestId
    } else if (userId) {
      filter.userId = userId
    }
    return CrossMathPlaySession.findOne(filter)
  }

  async findByUserAndStatus(
    status: SessionStatus | SessionStatus[],
    userId?: string,
    guestId?: string,
    gameType?: "crossmath" | "daily_challenge"
  ) {
    const statuses = Array.isArray(status) ? status : [status]
    const filter: Record<string, unknown> = { status: { $in: statuses } }
    if (gameType) {
      filter.$or = [
        { gameType },
        { gameType: { $exists: false } },
      ]
    }
    if (guestId) {
      filter.guestId = guestId
    } else if (userId) {
      filter.userId = userId
    }
    return CrossMathPlaySession.findOne(filter).sort({ lastSaveAt: -1 })
  }

  async findActiveDailyByChallenge(dailyChallengeId: string, userId?: string, guestId?: string) {
    const filter: Record<string, unknown> = {
      dailyChallengeId,
      gameType: "daily_challenge",
      status: { $in: ["playing", "paused"] },
    }
    if (guestId) {
      filter.guestId = guestId
    } else if (userId) {
      filter.userId = userId
    }
    return CrossMathPlaySession.findOne(filter).sort({ lastSaveAt: -1 })
  }

  async findByUser(
    query: SessionQuery = {},
    userId?: string,
    guestId?: string
  ) {
    const filter: Record<string, unknown> = {}
    if (guestId) {
      filter.guestId = guestId
    } else if (userId) {
      filter.userId = userId
    }
    if (query.status) {
      filter.status = query.status
    }
    const total = await CrossMathPlaySession.countDocuments(filter).catch(() => 0)
    const sessions = await CrossMathPlaySession.find(filter)
      .sort({ lastSaveAt: -1 })
      .skip(query.skip || 0)
      .limit(query.limit || 20)
      .lean()
    return { sessions, total }
  }

  async findRecentByUser(limit = 10, userId?: string, guestId?: string) {
    const filter: Record<string, unknown> = {}
    if (guestId) {
      filter.guestId = guestId
    } else if (userId) {
      filter.userId = userId
    }
    return CrossMathPlaySession.find(filter)
      .sort({ lastSaveAt: -1 })
      .limit(limit)
      .lean()
  }

  async saveProgress(
    sessionId: string,
    grid: Record<string, number>,
    elapsedTime: number,
    hintsUsed: number,
    mistakes: number,
    moves: number,
    userId?: string,
    guestId?: string
  ) {
    const filter: Record<string, unknown> = { sessionId, status: { $in: ["playing", "paused"] } }
    if (guestId) {
      filter.guestId = guestId
    } else if (userId) {
      filter.userId = userId
    }
    return CrossMathPlaySession.findOneAndUpdate(
      filter,
      {
        $set: {
          grid,
          elapsedTime,
          lastSaveAt: new Date(),
        },
        $max: { moves, mistakes, hintsUsed },
      },
      { returnDocument: "after" }
    )
  }

  async complete(
    sessionId: string,
    result: { correct: number; total: number; accuracy: number; elapsedTime: number; moves: number; mistakes: number; hintsUsed: number; score: number },
    userId?: string,
    guestId?: string
  ) {
    const now = new Date()
    const filter: Record<string, unknown> = { sessionId, status: { $in: ["playing", "paused"] } }
    if (guestId) {
      filter.guestId = guestId
    } else if (userId) {
      filter.userId = userId
    }
    return CrossMathPlaySession.findOneAndUpdate(
      filter,
      {
        $set: {
          status: "completed",
          completedAt: now,
          "result.correct": result.correct,
          "result.total": result.total,
          "result.accuracy": result.accuracy,
          "result.completedAt": now,
          "result.elapsedTime": result.elapsedTime,
          "result.moves": result.moves,
          "result.mistakes": result.mistakes,
          "result.hintsUsed": result.hintsUsed,
          "result.score": result.score,
          elapsedTime: result.elapsedTime,
          moves: result.moves,
          mistakes: result.mistakes,
          hintsUsed: result.hintsUsed,
          lastSaveAt: now,
        },
      },
      { returnDocument: "after" }
    )
  }

  async abandon(sessionId: string, userId?: string, guestId?: string) {
    const filter: Record<string, unknown> = { sessionId, status: { $in: ["playing", "paused"] } }
    if (guestId) {
      filter.guestId = guestId
    } else if (userId) {
      filter.userId = userId
    }
    return CrossMathPlaySession.findOneAndUpdate(
      filter,
      {
        $set: {
          status: "abandoned",
          abandonedAt: new Date(),
          lastSaveAt: new Date(),
        },
      },
      { returnDocument: "after" }
    )
  }

  async incrementRestartCount(sessionId: string) {
    return CrossMathPlaySession.findOneAndUpdate(
      { sessionId },
      { $inc: { restartCount: 1 } },
      { returnDocument: "after" }
    )
  }

  async deleteExpired(before: Date) {
    return CrossMathPlaySession.deleteMany({
      status: { $in: ["completed", "abandoned"] },
      lastSaveAt: { $lt: before },
    })
  }
}

export const playSessionRepository = new PlaySessionRepository()
