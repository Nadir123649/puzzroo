import { playSessionRepository } from "./PlaySessionRepository"
import { verificationEngine } from "./VerificationEngine"
import CrossMathPuzzle from "@/lib/server/models/CrossMathPuzzle"
import CrossMathPlaySession from "@/lib/server/models/CrossMathPlaySession"
import type { SafeSessionResponse, SafePuzzleResponse } from "../types"

function toSafeSession(session: Record<string, any>): SafeSessionResponse {
  const gridRaw = session.grid || {}
  const grid: Record<string, number> =
    gridRaw instanceof Map
      ? Object.fromEntries(gridRaw)
      : typeof gridRaw === "object" && gridRaw !== null
        ? gridRaw
        : {}

  return {
    sessionId: session.sessionId,
    puzzleId: session.puzzleId,
    difficulty: session.difficulty,
    status: session.status,
    grid,
    blanks: session.blanks || [],
    availableNumbers: session.availableNumbers || [],
    mistakes: session.mistakes || 0,
    hintsUsed: session.hintsUsed || 0,
    elapsedTime: session.elapsedTime || 0,
    startedAt: session.startedAt?.toISOString?.() || session.startedAt,
    pausedAt: session.pausedAt?.toISOString?.() || session.pausedAt || null,
    completedAt: session.completedAt?.toISOString?.() || session.completedAt || null,
    abandonedAt: session.abandonedAt?.toISOString?.() || session.abandonedAt || null,
    lastSaveAt: session.lastSaveAt?.toISOString?.() || session.lastSaveAt,
    isReplay: session.isReplay || false,
    restartCount: session.restartCount || 0,
    result: session.result || null,
  }
}

async function toSafePuzzleResponse(doc: any): Promise<SafePuzzleResponse> {
  const { getPatternById, patternToGameGrid } = await import("@shared/data/crossmath/patterns")
  const pattern = getPatternById(doc.patternId)
  const grid = pattern ? patternToGameGrid(pattern) : []
  return {
    id: doc.puzzleId,
    difficulty: doc.difficulty,
    patternId: doc.patternId,
    rows: pattern?.grid_rows || 0,
    columns: pattern?.grid_cols || 0,
    grid,
    availableNumbers: doc.availableNumbers || [],
    maxMistakes: doc.maxMistakes || 3,
  }
}

export class SessionService {
  async startSession(userId: string, puzzleId: string) {
    const puzzle = await CrossMathPuzzle.findOne({ puzzleId }).lean()
    if (!puzzle) throw new Error("puzzle_not_found")

    const existing = await playSessionRepository.findActiveByUserAndPuzzle(userId, puzzleId)
    if (existing) {
      return toSafeSession(existing.toObject())
    }

    const session = await playSessionRepository.create({
      userId,
      puzzleId,
      difficulty: (puzzle as any).difficulty,
      blanks: (puzzle as any).blanks || [],
      availableNumbers: (puzzle as any).availableNumbers || [],
    })
    return toSafeSession(session.toObject())
  }

  async getSession(sessionId: string, userId: string) {
    const session = await playSessionRepository.findById(sessionId)
    if (!session) throw new Error("session_not_found")
    if (session.userId.toString() !== userId) throw new Error("not_owner")
    return toSafeSession(session.toObject())
  }

  async pauseSession(sessionId: string, userId: string) {
    const session = await this.getSession(sessionId, userId)
    if (session.status !== "active") throw new Error("session_not_active")
    await CrossMathPlaySession.findOneAndUpdate(
      { sessionId },
      { $set: { status: "paused", pausedAt: new Date() } }
    )
    return this.getSession(sessionId, userId)
  }

  async resumeSession(sessionId: string, userId: string) {
    const session = await this.getSession(sessionId, userId)
    if (session.status !== "paused") throw new Error("session_not_paused")
    await CrossMathPlaySession.findOneAndUpdate(
      { sessionId },
      { $set: { status: "active" } }
    )
    return this.getSession(sessionId, userId)
  }

  async saveProgress(
    sessionId: string,
    userId: string,
    grid: Record<string, number>,
    elapsedTime: number,
    hintsUsed?: number,
    mistakes?: number
  ) {
    const session = await this.getSession(sessionId, userId)
    if (session.status !== "active" && session.status !== "paused") {
      throw new Error("session_not_active")
    }
    const update: Record<string, any> = { grid, elapsedTime, lastSaveAt: new Date() }
    if (hintsUsed !== undefined) update.hintsUsed = hintsUsed
    if (mistakes !== undefined) update.mistakes = mistakes
    await CrossMathPlaySession.findOneAndUpdate({ sessionId }, { $set: update })
    return this.getSession(sessionId, userId)
  }

  async verifyGrid(sessionId: string, userId: string, grid: Record<string, number>) {
    const session = await this.getSession(sessionId, userId)
    return verificationEngine.verify(session.puzzleId, grid)
  }

  async completeSession(
    sessionId: string,
    userId: string,
    grid: Record<string, number>
  ): Promise<
    | { completed: false; verifyResult: Awaited<ReturnType<typeof verificationEngine.verify>> }
    | { completed: true; verifyResult: Awaited<ReturnType<typeof verificationEngine.verify>>; session: SafeSessionResponse }
  > {
    const session = await this.getSession(sessionId, userId)
    if (session.status === "completed") throw new Error("already_completed")
    if (session.status === "abandoned") throw new Error("session_abandoned")

    const verifyResult = await verificationEngine.verify(session.puzzleId, grid)
    if (!verifyResult.completed) {
      return { completed: false, verifyResult }
    }

    await playSessionRepository.complete(sessionId, {
      correct: verifyResult.equations.filter(e => e.correct).length,
      total: verifyResult.equations.length,
      accuracy: verifyResult.accuracy,
      elapsedTime: session.elapsedTime,
    })
    const updated = await this.getSession(sessionId, userId)
    return { completed: true, verifyResult, session: updated }
  }

  async abandonSession(sessionId: string, userId: string) {
    const session = await this.getSession(sessionId, userId)
    if (session.status === "completed") throw new Error("already_completed")
    if (session.status === "abandoned") throw new Error("already_abandoned")
    await playSessionRepository.abandon(sessionId)
    return this.getSession(sessionId, userId)
  }

  async restartSession(sessionId: string, userId: string) {
    const session = await this.getSession(sessionId, userId)
    await playSessionRepository.abandon(sessionId)
    await playSessionRepository.incrementRestartCount(sessionId)
    return this.startSession(userId, session.puzzleId)
  }

  async replaySession(userId: string, puzzleId: string) {
    const existing = await playSessionRepository.findActiveByUserAndPuzzle(userId, puzzleId)
    if (existing) {
      await playSessionRepository.abandon(existing.sessionId)
    }
    return this.startSession(userId, puzzleId)
  }

  async getContinuePlaying(userId: string) {
    const session = await playSessionRepository.findByUserAndStatus(userId, ["active", "paused"])
    if (!session) return { hasActiveSession: false }

    const puzzle = await CrossMathPuzzle.findOne({ puzzleId: session.puzzleId }).lean()
    const safeSession = toSafeSession(session.toObject())
    const puzzleResp = puzzle ? await toSafePuzzleResponse(puzzle) : undefined

    return { hasActiveSession: true, session: { ...safeSession, puzzle: puzzleResp } }
  }

  async getRecentSessions(userId: string, limit = 10) {
    const sessions = await playSessionRepository.findRecentByUser(userId, limit)
    return sessions.map(s => toSafeSession(s))
  }

  async getSessionHistory(
    userId: string,
    options: { status?: string; difficulty?: string; limit?: number; skip?: number }
  ) {
    const filter: Record<string, unknown> = { userId }
    if (options.status) filter.status = options.status
    if (options.difficulty) filter.difficulty = options.difficulty

    const total = await CrossMathPlaySession.countDocuments(filter)
    const sessions = await CrossMathPlaySession.find(filter)
      .sort({ lastSaveAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 20)
      .lean()

    return { sessions: sessions.map(s => toSafeSession(s)), total }
  }

  async getCompletedPuzzles(userId: string, options: { limit?: number; skip?: number }) {
    const filter = { userId, status: "completed" as const }
    const total = await CrossMathPlaySession.countDocuments(filter)
    const sessions = await CrossMathPlaySession.find(filter)
      .sort({ completedAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 20)
      .lean()

    return { sessions: sessions.map(s => toSafeSession(s)), total }
  }

  async getPlayerStats(userId: string) {
    const stats = await (await import("../services/StatisticsService")).statisticsService.getUserStats(userId)
    return stats
  }
}

export const sessionService = new SessionService()
