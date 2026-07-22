import { v4 as uuidv4 } from "uuid"
import CrossMathPlaySession from "@/lib/server/models/CrossMathPlaySession"
import type { CrossMathDifficulty, SessionStatus } from "../types"

interface CreateSessionInput {
  userId: string
  puzzleId: string
  difficulty: CrossMathDifficulty
  blanks: string[]
  availableNumbers: number[]
}

interface SessionQuery {
  status?: SessionStatus
  limit?: number
  skip?: number
}

export class PlaySessionRepository {
  async create(input: CreateSessionInput) {
    return CrossMathPlaySession.create({
      sessionId: uuidv4(),
      userId: input.userId,
      puzzleId: input.puzzleId,
      difficulty: input.difficulty,
      status: "active",
      grid: {},
      blanks: input.blanks,
      availableNumbers: input.availableNumbers,
      startedAt: new Date(),
      lastSaveAt: new Date(),
    })
  }

  async findById(sessionId: string) {
    return CrossMathPlaySession.findOne({ sessionId })
  }

  async findByUserAndPuzzle(userId: string, puzzleId: string) {
    return CrossMathPlaySession.findOne({ userId, puzzleId })
  }

  async findActiveByUserAndPuzzle(userId: string, puzzleId: string) {
    return CrossMathPlaySession.findOne({
      userId,
      puzzleId,
      status: { $in: ["active", "paused"] },
    })
  }

  async findByUserAndStatus(
    userId: string,
    status: SessionStatus | SessionStatus[]
  ) {
    const statuses = Array.isArray(status) ? status : [status]
    return CrossMathPlaySession.findOne({
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
    const total = await CrossMathPlaySession.countDocuments(filter)
    const sessions = await CrossMathPlaySession.find(filter)
      .sort({ lastSaveAt: -1 })
      .skip(query.skip || 0)
      .limit(query.limit || 20)
      .lean()
    return { sessions, total }
  }

  async findRecentByUser(userId: string, limit = 10) {
    return CrossMathPlaySession.find({ userId })
      .sort({ lastSaveAt: -1 })
      .limit(limit)
      .lean()
  }

  async updateStatus(sessionId: string, status: SessionStatus) {
    return CrossMathPlaySession.findOneAndUpdate(
      { sessionId },
      { $set: { status } },
      { new: true }
    )
  }

  async saveGrid(sessionId: string, grid: Record<string, number>, elapsedTime: number) {
    return CrossMathPlaySession.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          grid,
          elapsedTime,
          lastSaveAt: new Date(),
        },
      },
      { new: true }
    )
  }

  async complete(
    sessionId: string,
    result: { correct: number; total: number; accuracy: number; elapsedTime: number }
  ) {
    return CrossMathPlaySession.findOneAndUpdate(
      { sessionId },
      {
        $set: {
          status: "completed",
          completedAt: new Date(),
          "result.correct": result.correct,
          "result.total": result.total,
          "result.accuracy": result.accuracy,
          "result.completedAt": new Date(),
          "result.elapsedTime": result.elapsedTime,
          elapsedTime: result.elapsedTime,
          lastSaveAt: new Date(),
        },
      },
      { new: true }
    )
  }

  async abandon(sessionId: string) {
    return CrossMathPlaySession.findOneAndUpdate(
      { sessionId },
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
    return CrossMathPlaySession.findOneAndUpdate(
      { sessionId },
      { $inc: { restartCount: 1 } },
      { new: true }
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
