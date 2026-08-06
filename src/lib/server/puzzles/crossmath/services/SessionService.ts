import { playSessionRepository } from "./PlaySessionRepository"
import { verificationEngine } from "./VerificationEngine"
import { statisticsService } from "./StatisticsService"
import CrossMathPuzzle from "@/lib/server/models/CrossMathPuzzle"
import CrossMathPlaySession from "@/lib/server/models/CrossMathPlaySession"
import GameProgress from "@/lib/server/models/GameProgress"
import UserStatistics from "@/lib/server/models/UserStatistics"
import type { Actor } from "@/app/api/v1/games/crossmath/route-helpers"
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

function computeProgress(grid: Record<string, number> | Map<string, number>, blanks: string[]): ProgressInfo {
  const g: Record<string, number> = grid instanceof Map ? Object.fromEntries(grid) : (grid || {})
  const filled = blanks.filter(b => g[b] !== undefined).length
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
      gameType: session.gameType || "crossmath",
      dailyChallengeId: session.dailyChallengeId || null,
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
      score: session.score || 0,
      // Only completed sessions carry a result; the schema's zero-default
      // subdoc must never leak into playing/abandoned session responses.
      result: session.status === 'completed' ? session.result || null : null,
    }
}

async function toSafePuzzleResponse(doc: any): Promise<SafePuzzleResponse> {
  const { getPatternById, patternToGameGrid } = await import("@shared/data/crossmath/patterns")
  const pattern = getPatternById(doc.patternId)
  const grid = pattern ? patternToGameGrid(pattern) : []
  const blankSet = new Set(doc.blanks || [])
  const solution = doc.solution || {}
  for (const pc of (pattern?.cells || [])) {
    if (pc.type === "NUMBER") {
      const key = `${pc.row}-${pc.col}`
      const cell = grid[pc.row]?.[pc.col]
      if (!cell) continue
      if (blankSet.has(key)) {
        cell.type = "empty"
        cell.value = undefined
        cell.isEditable = true
      } else {
        cell.type = "number"
        cell.value = solution[key]
        cell.isEditable = false
      }
    }
  }
  return {
    id: doc.puzzleId,
    difficulty: doc.difficulty,
    patternId: doc.patternId,
    rows: pattern?.grid_rows || 0,
    columns: pattern?.grid_cols || 0,
    grid,
    availableNumbers: doc.availableNumbers || [],
    maxMistakes: doc.maxMistakes || 3,
    solution: doc.solution || {},
  }
}

export class SessionService {
  private actorId(actor: Actor): string {
    return actor.id
  }

  private actorGuestId(actor: Actor): string | undefined {
    return actor.type === "guest" ? actor.id : undefined
  }

  private async mistakeLimitFor(session: { difficulty?: string; puzzleId: string }): Promise<number> {
    if (session.difficulty === "hard") return 2
    const puzzle = await CrossMathPuzzle.findOne({ puzzleId: session.puzzleId }).lean()
    return (puzzle as any)?.maxMistakes || 3
  }

  private async finalizeIfMistakeLimitReached(session: { sessionId: string; status?: string; mistakes?: number; difficulty?: string; puzzleId: string }, userId: string, guestId?: string): Promise<boolean> {
    if (session.status !== "playing" && session.status !== "paused") return false
    const limit = await this.mistakeLimitFor(session)
    if ((session.mistakes || 0) < limit) return false
    const abandoned = await playSessionRepository.abandon(session.sessionId, userId, guestId)
    if (abandoned && !guestId) {
      try {
        await statisticsService.updateOnSessionAbandon(userId, session.puzzleId, session.difficulty || "")
      } catch (error) {
        // statistics failure is non-fatal; session is already finalized
      }
    }
    return true
  }

  async startSession(actor: Actor, puzzleId: string, gameType?: "crossmath" | "daily_challenge", dailyChallengeId?: string) {
    const puzzle = await CrossMathPuzzle.findOne({ puzzleId }).lean()
    if (!puzzle) throw new Error("puzzle_not_found")

    const userId = this.actorId(actor)
    const guestId = this.actorGuestId(actor)

    if (gameType === "daily_challenge" && dailyChallengeId) {
      const existing = await playSessionRepository.findActiveDailyByChallenge(dailyChallengeId, userId, guestId)
      if (existing) {
        return toSafeSession(existing.toObject())
      }
    } else {
      const existing = await playSessionRepository.findActiveByUserAndPuzzle(puzzleId, userId, guestId)
      if (existing) {
        return toSafeSession(existing.toObject())
      }
    }

    const puzzleDoc = puzzle as any
    try {
      const session = await playSessionRepository.create({
        userId: guestId ? undefined : userId,
        guestId,
        puzzleId,
        gameType,
        dailyChallengeId,
        difficulty: puzzleDoc.difficulty,
        blanks: puzzleDoc.blanks || [],
        availableNumbers: puzzleDoc.availableNumbers || [],
      })

      if (userId && !guestId) {
        Promise.all([
          GameProgress.findOneAndUpdate(
            { userId, gameId: "crossmath", puzzleId },
            {
              $set: { difficulty: puzzleDoc.difficulty || "easy", updatedAt: new Date() },
              $inc: { attempts: 1 },
            },
            { upsert: true }
          ),
          UserStatistics.findOneAndUpdate(
            { userId, gameId: "crossmath" },
            {
              $set: { lastPlayedAt: new Date() },
              $inc: { totalPlayed: 1, [`perDifficulty.${puzzleDoc.difficulty || "easy"}.played`]: 1 },
            },
            { upsert: true }
          ),
        ]).catch(() => {})
      }

      return toSafeSession(session.toObject())
    } catch (error: any) {
      if (error?.code === 11000) {
        if (gameType === "daily_challenge" && dailyChallengeId) {
          const session = await playSessionRepository.findActiveDailyByChallenge(dailyChallengeId, userId, guestId)
          if (session) return toSafeSession(session.toObject())
        } else {
          const session = await playSessionRepository.findActiveByUserAndPuzzle(puzzleId, userId, guestId)
          if (session) return toSafeSession(session.toObject())
        }
      }
      throw error
    }
  }

  async getSession(sessionId: string, actor: Actor) {
    const session = await playSessionRepository.findById(sessionId)
    if (!session) throw new Error("session_not_found")
    const guestId = this.actorGuestId(actor)
    if (guestId) {
      if (session.guestId !== guestId) throw new Error("not_owner")
    } else {
      if (!session.userId || session.userId.toString() !== actor.id) throw new Error("not_owner")
    }
    return toSafeSession(session.toObject())
  }

  async pauseSession(sessionId: string, actor: Actor) {
    const session = await this.getSession(sessionId, actor)
    if (session.sessionStatus !== "playing") throw new Error("session_not_active")
    await CrossMathPlaySession.findOneAndUpdate(
      { sessionId },
      { $set: { status: "paused", pausedAt: new Date() } }
    )
    return this.getSession(sessionId, actor)
  }

  async resumeSession(sessionId: string, actor: Actor) {
    const session = await this.getSession(sessionId, actor)
    if (session.sessionStatus !== "paused") throw new Error("session_not_paused")
    await CrossMathPlaySession.findOneAndUpdate(
      { sessionId },
      { $set: { status: "playing" } }
    )
    return this.getSession(sessionId, actor)
  }

  async saveProgress(
    sessionId: string,
    actor: Actor,
    grid: Record<string, number>,
    elapsedTime: number,
    hintsUsed: number,
    mistakes: number,
    moves: number,
    score?: number
  ): Promise<SaveProgressResponse> {
    const userId = this.actorId(actor)
    const guestId = this.actorGuestId(actor)
    const updated = await playSessionRepository.saveProgress(
      sessionId, grid, elapsedTime, hintsUsed, mistakes, moves, score ?? 0, userId, guestId
    )
    if (!updated) {
      const exists = await playSessionRepository.findById(sessionId)
      if (!exists) throw new Error("session_not_found")
      if (guestId) {
        if (exists.guestId !== guestId) throw new Error("not_owner")
      } else {
        if (!exists.userId || exists.userId.toString() !== userId) throw new Error("not_owner")
      }
      throw new Error("session_not_active")
    }

    const terminal = await this.finalizeIfMistakeLimitReached(updated, userId, guestId)

    return {
      sessionId: updated.sessionId,
      sessionStatus: terminal ? "abandoned" : updated.status,
      lastSavedAt: updated.lastSaveAt?.toISOString?.() || new Date().toISOString(),
      moves: updated.moves,
      mistakes: updated.mistakes,
      hintsUsed: updated.hintsUsed,
      elapsedTime: updated.elapsedTime,
      score: updated.score || 0,
      progress: computeProgress(updated.grid, updated.blanks),
    }
  }

  async verifyGrid(sessionId: string, actor: Actor, grid: Record<string, number>) {
    const session = await this.getSession(sessionId, actor)
    return verificationEngine.verify(session.puzzleId, grid)
  }

  async completeSession(
    sessionId: string,
    actor: Actor,
    grid: Record<string, number>,
    elapsedTime: number,
    hintsUsed: number,
    mistakes: number,
    moves: number
  ): Promise<CompleteSessionResponse> {
    const session = await this.getSession(sessionId, actor)
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

    const userId = this.actorId(actor)
    const guestId = this.actorGuestId(actor)
    const updated = await playSessionRepository.complete(sessionId, {
      correct: verifyResult.correctEquations,
      total: verifyResult.totalEquations,
      accuracy: verifyResult.accuracy,
      elapsedTime,
      moves: finalMoves,
      mistakes: finalMistakes,
      hintsUsed: finalHintsUsed,
      score,
    }, userId, guestId)

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

  async abandonSession(sessionId: string, actor: Actor) {
    const session = await this.getSession(sessionId, actor)
    if (session.sessionStatus === "completed") throw new Error("already_completed")
    if (session.sessionStatus === "abandoned") throw new Error("already_abandoned")
    const userId = this.actorId(actor)
    const guestId = this.actorGuestId(actor)
    const updated = await playSessionRepository.abandon(sessionId, userId, guestId)
    if (!updated) throw new Error("session_not_active")
    return this.getSession(sessionId, actor)
  }

  async restartSession(sessionId: string, actor: Actor) {
    const session = await this.getSession(sessionId, actor)
    const userId = this.actorId(actor)
    const guestId = this.actorGuestId(actor)
    await playSessionRepository.abandon(sessionId, userId, guestId)
    await playSessionRepository.incrementRestartCount(sessionId)
    return this.startSession(actor, session.puzzleId)
  }

  async replaySession(actor: Actor, puzzleId: string) {
    const userId = this.actorId(actor)
    const guestId = this.actorGuestId(actor)
    const existing = await playSessionRepository.findActiveByUserAndPuzzle(puzzleId, userId, guestId)
    if (existing) {
      await playSessionRepository.abandon(existing.sessionId, userId, guestId)
    }
    const puzzle = await CrossMathPuzzle.findOne({ puzzleId }).lean()
    if (!puzzle) throw new Error("puzzle_not_found")
    const puzzleDoc = puzzle as any
    const session = await playSessionRepository.create({
      userId: guestId ? undefined : userId,
      guestId,
      puzzleId,
      difficulty: puzzleDoc.difficulty,
      blanks: puzzleDoc.blanks || [],
      availableNumbers: puzzleDoc.availableNumbers || [],
      isReplay: true,
    })
    return toSafeSession(session.toObject())
  }

  async getContinuePlaying(actor: Actor, gameType: "crossmath" | "daily_challenge" = "crossmath", difficulty?: string) {
    const userId = this.actorId(actor)
    const guestId = this.actorGuestId(actor)
    const session = await playSessionRepository.findByUserAndStatus(["playing", "paused"], userId, guestId, gameType, difficulty)
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

          await playSessionRepository.complete(session.sessionId, {
            correct: verifyResult.correctEquations,
            total: verifyResult.totalEquations,
            accuracy: verifyResult.accuracy,
            elapsedTime,
            moves,
            mistakes: storedMistakes,
            hintsUsed: storedHintsUsed,
            score,
          }, userId, guestId)

          return { hasActiveSession: false }
        }
      } catch (e) {
        // auto-complete failure is non-fatal; return active session
      }
    }

    const finalized = await this.finalizeIfMistakeLimitReached(session, userId, guestId)
    if (finalized) return { hasActiveSession: false }

    const puzzle = await CrossMathPuzzle.findOne({ puzzleId: session.puzzleId }).lean()
    const safeSession = toSafeSession(session.toObject())
    const puzzleResp = puzzle ? await toSafePuzzleResponse(puzzle) : undefined

    return { hasActiveSession: true, session: { ...safeSession, puzzle: puzzleResp } }
  }

  async startDailyChallenge(actor: Actor, puzzleId: string, dailyChallengeId: string) {
    return this.startSession(actor, puzzleId, "daily_challenge", dailyChallengeId)
  }

  async getContinueDailyChallenge(actor: Actor, dailyChallengeId: string) {
    const userId = this.actorId(actor)
    const guestId = this.actorGuestId(actor)
    const session = await playSessionRepository.findActiveDailyByChallenge(dailyChallengeId, userId, guestId)
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

    const filledCount = blanks.filter((b: string) => grid[b] !== undefined).length
    if (filledCount === blanks.length && blanks.length > 0) {
      try {
        const verifyResult = await verificationEngine.verify(session.puzzleId, grid)
        if (verifyResult.completed) {
          await playSessionRepository.complete(session.sessionId, {
            correct: verifyResult.correctEquations,
            total: verifyResult.totalEquations,
            accuracy: verifyResult.accuracy,
            elapsedTime: session.elapsedTime || 0,
            moves: session.moves || 0,
            mistakes: session.mistakes || 0,
            hintsUsed: session.hintsUsed || 0,
            score: calculateCrossMathScore(verifyResult.correctEquations, session.difficulty, session.mistakes || 0, session.hintsUsed || 0),
          }, userId, guestId)
          return { hasActiveSession: false }
        }
      } catch (e) {
        // auto-complete failure is non-fatal; return active session
      }
    }

    const finalized = await this.finalizeIfMistakeLimitReached(session, userId, guestId)
    if (finalized) return { hasActiveSession: false }

    const puzzle = await CrossMathPuzzle.findOne({ puzzleId: session.puzzleId }).lean()
    const safeSession = toSafeSession(session.toObject())
    const puzzleResp = puzzle ? await toSafePuzzleResponse(puzzle) : undefined

    return { hasActiveSession: true, session: { ...safeSession, puzzle: puzzleResp } }
  }

  async getRecentSessions(actor: Actor, limit = 10) {
    const userId = this.actorId(actor)
    const guestId = this.actorGuestId(actor)
    const sessions = await playSessionRepository.findRecentByUser(limit, userId, guestId)
    return sessions.map(s => toSafeSession(s))
  }

  async getSessionHistory(
    actor: Actor,
    options: { status?: string; difficulty?: string; limit?: number; skip?: number }
  ) {
    const userId = this.actorId(actor)
    const guestId = this.actorGuestId(actor)
    const filter: Record<string, unknown> = guestId ? { guestId } : { userId }
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

  async getCompletedPuzzles(actor: Actor, options: { limit?: number; skip?: number }) {
    const guestId = this.actorGuestId(actor)
    const filter: Record<string, unknown> = { status: "completed" as const }
    if (guestId) {
      filter.guestId = guestId
    } else {
      filter.userId = actor.id
    }
    const total = await CrossMathPlaySession.countDocuments(filter)
    const sessions = await CrossMathPlaySession.find(filter)
      .sort({ completedAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 20)
      .lean()

    return { sessions: sessions.map(s => toSafeSession(s)), total }
  }

  async getPlayerStats(actor: Actor) {
    const userId = this.actorId(actor)
    if (actor.type === "guest") {
      return null
    }
    const stats = await (await import("../services/StatisticsService")).statisticsService.getUserStats(userId)
    return stats
  }
}

export const sessionService = new SessionService()
