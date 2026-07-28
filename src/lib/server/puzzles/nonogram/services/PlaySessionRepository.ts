import { v4 as uuidv4 } from "uuid"
import NonogramPlaySession from "@/lib/server/models/NonogramPlaySession"
import type { NonogramDifficulty, SessionStatus } from "../types"

interface CreateSessionInput {
  userId: string
  puzzleId: string
  difficulty: NonogramDifficulty
}

interface SessionQuery {
  status?: SessionStatus
  limit?: number
  skip?: number
}

export class PlaySessionRepository {
  async create(input: CreateSessionInput) {
    return NonogramPlaySession.create({
      sessionId: uuidv4(),
      userId: input.userId,
      puzzleId: input.puzzleId,
      difficulty: input.difficulty,
      status: "playing",
      grid: [],
      startedAt: new Date(),
      lastSaveAt: new Date(),
    })
  }

  async findById(sessionId: string) {
    return NonogramPlaySession.findOne({ sessionId })
  }

  async findByUserAndPuzzle(userId: string, puzzleId: string) {
    return NonogramPlaySession.findOne({ userId, puzzleId })
  }

  async findActiveByUserAndPuzzle(userId: string, puzzleId: string) {
    console.log('[D] findActiveByUserAndPuzzle', { userId: userId?.substring(0,10), puzzleId: puzzleId?.substring(0,20), ts: Date.now() })
    const doc = await NonogramPlaySession.findOne({
      userId,
      puzzleId,
      status: { $in: ["playing", "paused"] },
    })
    console.log('[D] findActiveByUserAndPuzzle: result', { found: !!doc, status: doc?.status, ts: Date.now() })
    return doc
  }

  async findByUserAndStatus(
    userId: string,
    status: SessionStatus | SessionStatus[]
  ) {
    const statuses = Array.isArray(status) ? status : [status]
    return NonogramPlaySession.findOne({
      userId,
      status: { $in: statuses },
    }).sort({ lastSaveAt: -1 })
  }

  async findByUser(
    userId: string,
    query: SessionQuery = {}
  ) {
    const filter: Record<string, unknown> = { userId }
    if (query.status) {
      filter.status = query.status
    }
    const total = await NonogramPlaySession.countDocuments(filter)
    const sessions = await NonogramPlaySession.find(filter)
      .sort({ lastSaveAt: -1 })
      .skip(query.skip || 0)
      .limit(query.limit || 20)
      .lean()
    return { sessions, total }
  }

  async findRecentByUser(userId: string, limit = 10) {
    return NonogramPlaySession.find({ userId })
      .sort({ lastSaveAt: -1 })
      .limit(limit)
      .lean()
  }

  async updateStatus(sessionId: string, status: SessionStatus) {
    return NonogramPlaySession.findOneAndUpdate(
      { sessionId },
      { $set: { status } },
      { new: true }
    )
  }

  async saveProgress(
    sessionId: string,
    userId: string,
    grid: any,
    elapsedTime: number,
    hintsUsed: number,
    mistakes: number,
    moves: number
  ) {
    return NonogramPlaySession.findOneAndUpdate(
      {
        sessionId,
        userId: userId,
        status: { $in: ["playing", "paused"] },
      },
      {
        $set: {
          grid,
          elapsedTime,
          hintsUsed,
          mistakes,
          lastSaveAt: new Date(),
        },
        $max: { moves },
      },
      { new: true }
    )
  }

  async saveGrid(sessionId: string, grid: any, elapsedTime: number, moves?: number) {
    const update: Record<string, any> = {
      $set: {
        grid,
        elapsedTime,
        lastSaveAt: new Date(),
      },
    }
    if (moves !== undefined) {
      update.$max = { moves }
    }
    return NonogramPlaySession.findOneAndUpdate(
      { sessionId },
      update,
      { new: true }
    )
  }

  async complete(
    sessionId: string,
    result: { correct: number; total: number; accuracy: number; elapsedTime: number; moves: number; mistakes: number; hintsUsed: number; score: number }
  ) {
    const now = new Date()
    return NonogramPlaySession.findOneAndUpdate(
      { sessionId, status: { $in: ["playing", "paused"] } },
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
      { new: true }
    )
  }

  async abandon(sessionId: string) {
    return NonogramPlaySession.findOneAndUpdate(
      { sessionId, status: { $in: ["playing", "paused"] } },
      {
        $set: {
          status: "abandoned",
          abandonedAt: new Date(),
          lastSaveAt: new Date(),
        },
      },
      { new: true }
    )
  }

  async incrementRestartCount(sessionId: string) {
    return NonogramPlaySession.findOneAndUpdate(
      { sessionId },
      { $inc: { restartCount: 1 } },
      { new: true }
    )
  }

  async deleteExpired(before: Date) {
    return NonogramPlaySession.deleteMany({
      status: { $in: ["completed", "abandoned"] },
      lastSaveAt: { $lt: before },
    })
  }
}

export const playSessionRepository = new PlaySessionRepository()