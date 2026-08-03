import { v4 as uuidv4 } from "uuid"
import TangramPlaySession from "@/lib/server/models/TangramPlaySession"
import type { TangramDifficulty, SessionStatus } from "../types"

export interface PieceStateRecord {
  pieceId: string
  position: { x: number; y: number }
  rotation: number
  flipped?: boolean
  placed?: boolean
  snapped?: boolean
}

interface CreateSessionInput {
  userId?: string
  guestId?: string
  puzzleId: string
  gameType?: "tangram" | "daily_challenge"
  dailyChallengeId?: string
  difficulty: TangramDifficulty
  pieceStates?: PieceStateRecord[]
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
      gameType: input.gameType || "tangram",
      difficulty: input.difficulty,
      status: "playing",
      pieceStates: input.pieceStates || [],
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
    return TangramPlaySession.create(doc)
  }

  async findById(sessionId: string) {
    return TangramPlaySession.findOne({ sessionId })
  }

  async findByUserAndPuzzle(puzzleId: string, userId?: string, guestId?: string) {
    const filter: Record<string, unknown> = { puzzleId }
    if (guestId) {
      filter.guestId = guestId
    } else if (userId) {
      filter.userId = userId
    }
    return TangramPlaySession.findOne(filter)
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
    return TangramPlaySession.findOne(filter)
  }

  async findByUserAndStatus(
    status: SessionStatus | SessionStatus[],
    userId?: string,
    guestId?: string,
    gameType?: "tangram" | "daily_challenge",
    difficulty?: string
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
    if (difficulty) {
      filter.difficulty = difficulty
    }
    return TangramPlaySession.findOne(filter).sort({ lastSaveAt: -1 })
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
    return TangramPlaySession.findOne(filter).sort({ lastSaveAt: -1 })
  }

  async findByUser(query: SessionQuery = {}, userId?: string, guestId?: string) {
    const filter: Record<string, unknown> = {}
    if (guestId) {
      filter.guestId = guestId
    } else if (userId) {
      filter.userId = userId
    }
    if (query.status) {
      filter.status = query.status
    }
    const total = await TangramPlaySession.countDocuments(filter).catch(() => 0)
    const sessions = await TangramPlaySession.find(filter)
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
    return TangramPlaySession.find(filter)
      .sort({ lastSaveAt: -1 })
      .limit(limit)
      .lean()
  }

  async saveProgress(
    sessionId: string,
    pieceStates: PieceStateRecord[],
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
    return TangramPlaySession.findOneAndUpdate(
      filter,
      {
        $set: {
          pieceStates,
          lastSaveAt: new Date(),
        },
        $max: { elapsedTime, hintsUsed, mistakes, moves },
      },
      { returnDocument: "after" }
    )
  }

  async complete(
    sessionId: string,
    result: { accuracy: number; piecesCorrect: number; totalPieces: number; elapsedTime: number; moves: number; mistakes: number; hintsUsed: number; score: number },
    pieceStates: PieceStateRecord[],
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
    return TangramPlaySession.findOneAndUpdate(
      filter,
      {
        $set: {
          status: "completed",
          completedAt: now,
          pieceStates,
          "result.accuracy": result.accuracy,
          "result.piecesCorrect": result.piecesCorrect,
          "result.totalPieces": result.totalPieces,
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
    return TangramPlaySession.findOneAndUpdate(
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
    return TangramPlaySession.findOneAndUpdate(
      { sessionId },
      { $inc: { restartCount: 1 } },
      { returnDocument: "after" }
    )
  }

  async deleteExpired(before: Date) {
    return TangramPlaySession.deleteMany({
      status: { $in: ["completed", "abandoned"] },
      lastSaveAt: { $lt: before },
    })
  }
}

export const playSessionRepository = new PlaySessionRepository()
