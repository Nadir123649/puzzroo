import { playSessionRepository } from "./PlaySessionRepository"
import { verificationEngine } from "./VerificationEngine"
import CrossMathPuzzle from "@/lib/server/models/CrossMathPuzzle"
import CrossMathPlaySession from "@/lib/server/models/CrossMathPlaySession"
import type { SafeSessionResponse, SafePuzzleResponse, SaveProgressResponse, ProgressInfo, CompleteSessionResponse, CompletionResult, VerificationSummary, EquationError } from "../types"

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
    console.log('[D] startSession', { userId: userId?.substring(0,10), puzzleId: puzzleId?.substring(0,20), ts: Date.now() })
    const puzzle = await CrossMathPuzzle.findOne({ puzzleId }).lean()
    if (!puzzle) throw new Error("puzzle_not_found")

    const existing = await playSessionRepository.findActiveByUserAndPuzzle(userId, puzzleId)
    console.log('[D] startSession: existing check', { found: !!existing, status: existing?.status, ts: Date.now() })
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
    console.log('[TRACE] saveProgress called', { sessionId: sessionId?.substring(0,20), userId: userId?.substring(0,10), gridSize: Object.keys(grid).length, elapsedTime, ts: Date.now() })
    const updated = await playSessionRepository.saveProgress(
      sessionId, userId, grid, elapsedTime, hintsUsed, mistakes, moves
    )
    console.log('[TRACE] saveProgress result', { sessionId: sessionId?.substring(0,20), found: !!updated, status: updated?.status, ts: Date.now() })
    if (!updated) {
      const exists = await playSessionRepository.findById(sessionId)
      console.log('[TRACE] saveProgress fallback read', { sessionId: sessionId?.substring(0,20), found: !!exists, status: exists?.status, ts: Date.now() })
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
    moves: number,
    score: number
  ): Promise<CompleteSessionResponse> {
    console.log('[TRACE] completeSession', { sessionId: sessionId?.substring(0,20), userId: userId?.substring(0,10), gridSize: Object.keys(grid).length, ts: Date.now() })
    const session = await this.getSession(sessionId, userId)
    console.log('[TRACE] completeSession: current status', { sessionId: sessionId?.substring(0,20), status: session.sessionStatus, ts: Date.now() })
    if (session.sessionStatus === "completed") throw new Error("already_completed")
    if (session.sessionStatus === "abandoned") throw new Error("session_abandoned")

    const verifyResult = await verificationEngine.verify(session.puzzleId, grid)
    console.log('[TRACE] completeSession: verify result', { sessionId: sessionId?.substring(0,20), completed: verifyResult.completed, allCorrect: verifyResult.isCorrect, ts: Date.now() })
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

    const updated = await playSessionRepository.complete(sessionId, {
      correct: verifyResult.correctEquations,
      total: verifyResult.totalEquations,
      accuracy: verifyResult.accuracy,
      elapsedTime,
      moves,
      mistakes,
      hintsUsed,
      score,
    })

    console.log('[TRACE] completeSession: DB update result', { sessionId: sessionId?.substring(0,20), found: !!updated, newStatus: updated?.status, ts: Date.now() })
    if (!updated) throw new Error("already_completed")

    return {
      isCompleted: true,
      result: {
        sessionId,
        puzzleId: session.puzzleId,
        difficulty: session.difficulty,
        completedAt: updated.completedAt?.toISOString?.() || new Date().toISOString(),
        elapsedTime,
        moves,
        mistakes,
        hintsUsed,
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
    return this.startSession(userId, puzzleId)
  }

  async getContinuePlaying(userId: string) {
    console.log('[TRACE] getContinuePlaying', { userId: userId?.substring(0,10), ts: Date.now() })
    const session = await playSessionRepository.findByUserAndStatus(userId, ["playing", "paused"])
    if (!session) {
      console.log('[TRACE] getContinuePlaying: no active session', { userId: userId?.substring(0,10), ts: Date.now() })
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

    console.log('[TRACE] getContinuePlaying: session found', {
      sessionId: session.sessionId?.substring(0,20),
      status: session.status,
      puzzleId: session.puzzleId?.substring(0,20),
      blanksCount: blanks.length,
      gridKeys: Object.keys(grid).length,
      ts: Date.now(),
    })

    // If grid is fully filled, verify it. If solved, auto-complete rather
    // than returning a session the user can't make progress on. This
    // eliminates the tab-close / network-failure race where the client's
    // fire-and-forget "complete" request never reached the server.
    const filledCount = blanks.filter((b: string) => grid[b] !== undefined).length
    console.log('[TRACE] getContinuePlaying: auto-complete check', {
      sessionId: session.sessionId?.substring(0,20),
      filledCount,
      blanksLength: blanks.length,
      allFilled: filledCount === blanks.length,
      shouldAutoComplete: filledCount === blanks.length && blanks.length > 0,
      ts: Date.now(),
    })
    if (filledCount === blanks.length && blanks.length > 0) {
      try {
        const verifyResult = await verificationEngine.verify(session.puzzleId, grid)
        console.log('[TRACE] getContinuePlaying: verify result', {
          sessionId: session.sessionId?.substring(0,20),
          completed: verifyResult.completed,
          allCorrect: verifyResult.isCorrect,
          ts: Date.now(),
        })
        if (verifyResult.completed) {
          const mistakes = session.mistakes || 0
          const hintsUsed = session.hintsUsed || 0
          const moves = session.moves || 0
          const elapsedTime = session.elapsedTime || 0
          const score = Math.max(0, verifyResult.correctEquations * 10 - mistakes * 5 - hintsUsed * 20)

          console.log('[TRACE] getContinuePlaying: auto-completing', {
            sessionId: session.sessionId?.substring(0,20),
            score,
            ts: Date.now(),
          })
          const completed = await playSessionRepository.complete(session.sessionId, {
            correct: verifyResult.correctEquations,
            total: verifyResult.totalEquations,
            accuracy: verifyResult.accuracy,
            elapsedTime,
            moves,
            mistakes,
            hintsUsed,
            score,
          })
          console.log('[TRACE] getContinuePlaying: auto-complete result', {
            sessionId: session.sessionId?.substring(0,20),
            success: !!completed,
            newStatus: completed?.status,
            ts: Date.now(),
          })

          return { hasActiveSession: false }
        }
      } catch (e) {
        console.log('[TRACE] getContinuePlaying: auto-complete error', {
          sessionId: session.sessionId?.substring(0,20),
          error: (e as Error)?.message,
          ts: Date.now(),
        })
      }
    }

    const puzzle = await CrossMathPuzzle.findOne({ puzzleId: session.puzzleId }).lean()
    const safeSession = toSafeSession(session.toObject())
    const puzzleResp = puzzle ? await toSafePuzzleResponse(puzzle) : undefined

    console.log('[TRACE] getContinuePlaying: returning session', {
      sessionId: session.sessionId?.substring(0,20),
      hasActiveSession: true,
      ts: Date.now(),
    })
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
