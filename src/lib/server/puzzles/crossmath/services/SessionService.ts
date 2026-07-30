import { playSessionRepository } from "./PlaySessionRepository"
import { verificationEngine } from "./VerificationEngine"
import CrossMathPuzzle from "@/lib/server/models/CrossMathPuzzle"
import CrossMathPlaySession from "@/lib/server/models/CrossMathPlaySession"
import type { SafeSessionResponse, SafePuzzleResponse, SaveProgressResponse, ProgressInfo, CompleteSessionResponse, CompletionResult, VerificationSummary, EquationError } from "../types"

function calculateCrossMathScore(
  correctEquations: number,
  difficulty: string,
  mistakes: number,
  hintsUsed: number
): number {
  const difficultyMultiplier: Record<string, number> = { easy: 1, medium: 1.5, hard: 2 }
  const multiplier = difficultyMultiplier[difficulty] ?? 1
  return Math.max(0, Math.round(correctEquations * 10 * multiplier - mistakes * 5 - hintsUsed * 20))
}

function computeProgress(grid: Record<string, number>, blanks: string[]): ProgressInfo {
  const filled = blanks.filter(b => grid[b] !== undefined).length
  return {
    filledCells: filled,
    totalBlanks: blanks.length,
    percentage: blanks.length > 0 ? Math.round((filled / blanks.length) * 100) : 100,
  }
}

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
      sessionStatus: session.status,
      grid,
      blanks: session.blanks || [],
      availableNumbers: session.availableNumbers || [],
      moves: session.moves || 0,
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

    const puzzleDoc = puzzle as any
    try {
      const session = await playSessionRepository.create({
        userId,
        puzzleId,
        difficulty: puzzleDoc.difficulty,
        blanks: puzzleDoc.blanks || [],
        availableNumbers: puzzleDoc.availableNumbers || [],
      })
      return toSafeSession(session.toObject())
    } catch (error: any) {
      if (error?.code === 11000) {
        const session = await playSessionRepository.findActiveByUserAndPuzzle(userId, puzzleId)
        if (session) return toSafeSession(session.toObject())
      }
      throw error
    }
  }

  async getSession(sessionId: string, userId: string) {
    const session = await playSessionRepository.findById(sessionId)
    if (!session) throw new Error("session_not_found")
    if (session.userId.toString() !== userId) throw new Error("not_owner")
    return toSafeSession(session.toObject())
  }

  async pauseSession(sessionId: string, userId: string) {
    const session = await this.getSession(sessionId, userId)
    if (session.sessionStatus !== "playing") throw new Error("session_not_active")
    await CrossMathPlaySession.findOneAndUpdate(
      { sessionId },
      { $set: { status: "paused", pausedAt: new Date() } }
    )
    return this.getSession(sessionId, userId)
  }

  async resumeSession(sessionId: string, userId: string) {
    const session = await this.getSession(sessionId, userId)
    if (session.sessionStatus !== "paused") throw new Error("session_not_paused")
    await CrossMathPlaySession.findOneAndUpdate(
      { sessionId },
      { $set: { status: "playing" } }
    )
    return this.getSession(sessionId, userId)
  }

  async saveProgress(
    sessionId: string,
    userId: string,
    grid: Record<string, number>,
    elapsedTime: number,
    hintsUsed: number,
    mistakes: number,
    moves: number
  ): Promise<SaveProgressResponse> {
    const updated = await playSessionRepository.saveProgress(
      sessionId, userId, grid, elapsedTime, hintsUsed, mistakes, moves
    )
    if (!updated) {
      const exists = await playSessionRepository.findById(sessionId)
      if (!exists) throw new Error("session_not_found")
      if (exists.userId.toString() !== userId) throw new Error("not_owner")
      throw new Error("session_not_active")
    }
    return {
      sessionId: updated.sessionId,
      sessionStatus: updated.status,
      lastSavedAt: updated.lastSaveAt?.toISOString?.() || new Date().toISOString(),
      moves: updated.moves,
      mistakes: updated.mistakes,
      hintsUsed: updated.hintsUsed,
      elapsedTime: updated.elapsedTime,
      progress: computeProgress(updated.grid, updated.blanks),
    }
  }

  async verifyGrid(sessionId: string, userId: string, grid: Record<string, number>) {
    const session = await this.getSession(sessionId, userId)
    return verificationEngine.verify(session.puzzleId, grid)
  }

  async completeSession(
    sessionId: string,
    userId: string,
    grid: Record<string, number>,
    elapsedTime: number,
    hintsUsed: number,
    mistakes: number,
    moves: number
  ): Promise<CompleteSessionResponse> {
    const session = await this.getSession(sessionId, userId)
    if (session.sessionStatus === "completed") throw new Error("already_completed")
    if (session.sessionStatus === "abandoned") throw new Error("session_abandoned")

    const verifyResult = await verificationEngine.verify(session.puzzleId, grid)
    if (!verifyResult.completed) {
      return {
        isCompleted: false,
        result: null,
        verification: {
          isCorrect: verifyResult.isCorrect,
          accuracy: verifyResult.accuracy,
          totalEquations: verifyResult.totalEquations,
          correctEquations: verifyResult.correctEquations,
          incorrectEquations: verifyResult.incorrectEquations,
          errors: verifyResult.errors,
        },
        session: {
          elapsedTime,
          moves,
          mistakes,
          hintsUsed,
        },
      }
    }

    const finalMistakes = Math.max(session.mistakes || 0, mistakes)
    const finalHintsUsed = Math.max(session.hintsUsed || 0, hintsUsed)
    const finalMoves = Math.max(session.moves || 0, moves)
    const score = calculateCrossMathScore(verifyResult.correctEquations, session.difficulty, finalMistakes, finalHintsUsed)

    const updated = await playSessionRepository.complete(sessionId, {
      correct: verifyResult.correctEquations,
      total: verifyResult.totalEquations,
      accuracy: verifyResult.accuracy,
      elapsedTime,
      moves: finalMoves,
      mistakes: finalMistakes,
      hintsUsed: finalHintsUsed,
      score,
    })

    if (!updated) throw new Error("already_completed")

    return {
      isCompleted: true,
      result: {
        sessionId,
        puzzleId: session.puzzleId,
        difficulty: session.difficulty,
        completedAt: updated.completedAt?.toISOString?.() || new Date().toISOString(),
        elapsedTime,
        moves: finalMoves,
        mistakes: finalMistakes,
        hintsUsed: finalHintsUsed,
        score,
        accuracy: verifyResult.accuracy,
        totalEquations: verifyResult.totalEquations,
        correctEquations: verifyResult.correctEquations,
        incorrectEquations: verifyResult.incorrectEquations,
      },
      verification: {
        isCorrect: verifyResult.isCorrect,
        accuracy: verifyResult.accuracy,
        totalEquations: verifyResult.totalEquations,
        correctEquations: verifyResult.correctEquations,
        incorrectEquations: verifyResult.incorrectEquations,
        errors: verifyResult.errors,
      },
    }
  }

  async abandonSession(sessionId: string, userId: string) {
    const session = await this.getSession(sessionId, userId)
    if (session.sessionStatus === "completed") throw new Error("already_completed")
    if (session.sessionStatus === "abandoned") throw new Error("already_abandoned")
    const updated = await playSessionRepository.abandon(sessionId)
    if (!updated) throw new Error("session_not_active")
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
    const puzzle = await CrossMathPuzzle.findOne({ puzzleId }).lean()
    if (!puzzle) throw new Error("puzzle_not_found")
    const puzzleDoc = puzzle as any
    const session = await playSessionRepository.create({
      userId,
      puzzleId,
      difficulty: puzzleDoc.difficulty,
      blanks: puzzleDoc.blanks || [],
      availableNumbers: puzzleDoc.availableNumbers || [],
      isReplay: true,
    })
    return toSafeSession(session.toObject())
  }

  async getContinuePlaying(userId: string) {
    const session = await playSessionRepository.findByUserAndStatus(userId, ["playing", "paused"])
    if (!session) {
      return { hasActiveSession: false }
    }

    const blanks = session.blanks || []
    const gridRaw = session.grid || {}
    const grid: Record<string, number> =
      gridRaw instanceof Map
        ? Object.fromEntries(gridRaw)
        : typeof gridRaw === "object" && gridRaw !== null
          ? gridRaw
          : {}

    // If grid is fully filled, verify it. If solved, auto-complete rather
    // than returning a session the user can't make progress on. This
    // eliminates the tab-close / network-failure race where the client's
    // fire-and-forget "complete" request never reached the server.
    const filledCount = blanks.filter((b: string) => grid[b] !== undefined).length
    if (filledCount === blanks.length && blanks.length > 0) {
      try {
        const verifyResult = await verificationEngine.verify(session.puzzleId, grid)
        if (verifyResult.completed) {
          const storedMistakes = session.mistakes || 0
          const storedHintsUsed = session.hintsUsed || 0
          const moves = session.moves || 0
          const elapsedTime = session.elapsedTime || 0
          const score = calculateCrossMathScore(verifyResult.correctEquations, session.difficulty, storedMistakes, storedHintsUsed)

          const completed = await playSessionRepository.complete(session.sessionId, {
            correct: verifyResult.correctEquations,
            total: verifyResult.totalEquations,
            accuracy: verifyResult.accuracy,
            elapsedTime,
            moves,
            mistakes: storedMistakes,
            hintsUsed: storedHintsUsed,
            score,
          })

          return { hasActiveSession: false }
        }
      } catch (e) {
        // auto-complete failure is non-fatal; return active session
      }
    }

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
