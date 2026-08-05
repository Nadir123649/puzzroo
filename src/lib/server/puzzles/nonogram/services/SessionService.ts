import { playSessionRepository } from "./PlaySessionRepository"
import { verificationEngine } from "./VerificationEngine"
import NonogramPuzzle from "@/lib/server/models/NonogramPuzzle"
import NonogramPlaySession from "@/lib/server/models/NonogramPlaySession"
import GameProgress from "@/lib/server/models/GameProgress"
import UserStatistics from "@/lib/server/models/UserStatistics"
import type { Actor } from "@/app/api/v1/games/nonogram/route-helpers"
import type {
  SafeSessionResponse,
  SafePuzzleResponse,
  SaveProgressResponse,
  ProgressInfo,
  CompleteSessionResponse,
} from "../types"

const EXPIRED_SESSION_RETENTION_MS = 90 * 24 * 60 * 60 * 1000

function computeProgress(grid: string[][], blanks: string[]): ProgressInfo {
  let filled = 0
  let total = 0
  if (Array.isArray(grid)) {
    for (const row of grid) {
      if (Array.isArray(row)) {
        for (const cell of row) {
          total++
          if (cell === 'filled') {
            filled++
          }
        }
      }
    }
  }
  return {
    filledCells: filled,
    totalBlanks: total,
    percentage: total > 0 ? Math.round((filled / total) * 100) : 100,
  }
}

function toSafeSession(session: Record<string, any>): SafeSessionResponse {
  const gridRaw = session.grid || []
  const grid: string[][] = Array.isArray(gridRaw) ? gridRaw : []

  return {
    sessionId: session.sessionId || session._id?.toString(),
    puzzleId: session.puzzleId,
    gameType: session.gameType || "nonogram",
    dailyChallengeId: session.dailyChallengeId || null,
    difficulty: session.difficulty,
    sessionStatus: session.status,
    grid,
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
  const { rowClues, columnClues } = doc
  return {
    id: doc.puzzleId,
    game: doc.game || "nonogram",
    difficulty: doc.difficulty,
    size: doc.size,
    title: doc.title,
    category: doc.category,
    rowClues,
    columnClues,
    solution: doc.solution,
    hash: doc.hash,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    estimatedTime: doc.estimatedTime || 0,
  }
}

export class SessionService {
  private actorId(actor: Actor): string {
    return actor.id
  }

  private actorGuestId(actor: Actor): string | undefined {
    return actor.type === "guest" ? actor.id : undefined
  }

  private async pruneExpiredSessions() {
    try {
      await playSessionRepository.deleteExpired(new Date(Date.now() - EXPIRED_SESSION_RETENTION_MS))
    } catch (error) {
      // cleanup failure is non-fatal
    }
  }

  async startSession(actor: Actor, puzzleId: string, gameType?: "nonogram" | "daily_challenge", dailyChallengeId?: string) {
    const puzzle = await NonogramPuzzle.findOne({ puzzleId }).lean()
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
      })

      if (userId && !guestId) {
        Promise.all([
          GameProgress.findOneAndUpdate(
            { userId, gameId: "nonogram", puzzleId },
            {
              $set: { difficulty: puzzleDoc.difficulty || "easy", updatedAt: new Date() },
              $inc: { attempts: 1 },
            },
            { upsert: true }
          ),
          UserStatistics.findOneAndUpdate(
            { userId, gameId: "nonogram" },
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
    await NonogramPlaySession.findOneAndUpdate(
      { sessionId },
      { $set: { status: "paused", pausedAt: new Date() } }
    )
    return this.getSession(sessionId, actor)
  }

  async resumeSession(sessionId: string, actor: Actor) {
    const session = await this.getSession(sessionId, actor)
    if (session.sessionStatus !== "paused") throw new Error("session_not_paused")
    await NonogramPlaySession.findOneAndUpdate(
      { sessionId },
      { $set: { status: "playing" } }
    )
    return this.getSession(sessionId, actor)
  }

  async saveProgress(
    sessionId: string,
    actor: Actor,
    grid: string[][],
    elapsedTime: number,
    hintsUsed: number,
    mistakes: number,
    moves: number
  ): Promise<SaveProgressResponse> {
    const userId = this.actorId(actor)
    const guestId = this.actorGuestId(actor)
    const updated = await playSessionRepository.saveProgress(
      sessionId, grid, elapsedTime, hintsUsed, mistakes, moves, userId, guestId
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

    return {
      sessionId: updated.sessionId,
      sessionStatus: updated.status,
      lastSavedAt: updated.lastSaveAt?.toISOString?.() || new Date().toISOString(),
      moves: updated.moves,
      mistakes: updated.mistakes,
      hintsUsed: updated.hintsUsed,
      elapsedTime: updated.elapsedTime,
      progress: computeProgress(updated.grid || [], []),
    }
  }

  async verifySession(sessionId: string, actor: Actor, grid: string[][]) {
    const session = await this.getSession(sessionId, actor)
    return verificationEngine.verifyCompletion(session.puzzleId, grid)
  }

  async completeSession(
    sessionId: string,
    actor: Actor,
    grid: string[][],
    elapsedTime: number,
    hintsUsed: number,
    mistakes: number,
    moves: number
  ): Promise<CompleteSessionResponse> {
    const session = await this.getSession(sessionId, actor)
    if (session.sessionStatus === "completed") throw new Error("already_completed")
    if (session.sessionStatus === "abandoned") throw new Error("session_abandoned")

    const verification = await verificationEngine.verifyCompletion(session.puzzleId, grid)

    if (!verification.isComplete) {
      return {
        isCompleted: false,
        result: null,
        verification: {
          accuracy: verification.accuracy,
          isComplete: verification.isComplete,
          totalCellsRequired: verification.totalCellsRequired,
          correctCells: verification.correctCells,
          incorrectCells: verification.incorrectCells,
        },
        session: { elapsedTime, moves, mistakes, hintsUsed },
      }
    }

    const finalMistakes = Math.max(session.mistakes || 0, mistakes)
    const finalHintsUsed = Math.max(session.hintsUsed || 0, hintsUsed)
    const finalMoves = Math.max(session.moves || 0, moves)
    const score = Math.max(0, Math.round(verification.accuracy * 10 * (session.difficulty === "hard" ? 2 : session.difficulty === "medium" ? 1.5 : 1) - finalHintsUsed * 50 - finalMistakes * 25))

    const userId = this.actorId(actor)
    const guestId = this.actorGuestId(actor)
    const updated = await playSessionRepository.complete(sessionId, {
      correct: verification.correctCells,
      total: verification.totalCellsRequired,
      accuracy: verification.accuracy,
      elapsedTime,
      moves: finalMoves,
      mistakes: finalMistakes,
      hintsUsed: finalHintsUsed,
      score,
    }, grid, userId, guestId)

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
        accuracy: verification.accuracy,
      },
      verification: {
        accuracy: verification.accuracy,
        isComplete: verification.isComplete,
        totalCellsRequired: verification.totalCellsRequired,
        correctCells: verification.correctCells,
        incorrectCells: verification.incorrectCells,
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

    if (userId && !guestId) {
      await GameProgress.findOneAndUpdate(
        { userId, gameId: "nonogram", puzzleId: session.puzzleId },
        { $set: { abandonedAt: new Date(), updatedAt: new Date() } }
      )
      await UserStatistics.findOneAndUpdate(
        { userId, gameId: "nonogram" },
        { $inc: { totalAbandoned: 1 }, $set: { lastAbandonedAt: new Date() } },
        { upsert: true }
      )
    }

    return toSafeSession(updated.toObject())
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
    const puzzle = await NonogramPuzzle.findOne({ puzzleId }).lean()
    if (!puzzle) throw new Error("puzzle_not_found")
    const puzzleDoc = puzzle as any
    const session = await playSessionRepository.create({
      userId: guestId ? undefined : userId,
      guestId,
      puzzleId,
      difficulty: puzzleDoc.difficulty,
      isReplay: true,
    })
    return toSafeSession(session.toObject())
  }

  async getContinuePlaying(actor: Actor, gameType: "nonogram" | "daily_challenge" = "nonogram", difficulty?: string) {
    const userId = this.actorId(actor)
    const guestId = this.actorGuestId(actor)
    await this.pruneExpiredSessions()
    const session = await playSessionRepository.findByUserAndStatus(["playing", "paused"], userId, guestId, gameType, difficulty)
    if (!session) {
      return { hasActiveSession: false }
    }

    const grid: string[][] = Array.isArray(session.grid) ? session.grid : []
    const size = session.grid?.[0]?.length || 0
    const filledCount = grid.flat().filter((c) => c === "filled").length
    if (size > 0 && filledCount > 0) {
      try {
        const verifyResult = await verificationEngine.verifyCompletion(session.puzzleId, grid)
        if (verifyResult.isComplete) {
          const storedMistakes = session.mistakes || 0
          const storedHintsUsed = session.hintsUsed || 0
          const moves = session.moves || 0
          const elapsedTime = session.elapsedTime || 0
          const score = Math.max(0, Math.round(verifyResult.accuracy * 10 * (session.difficulty === "hard" ? 2 : session.difficulty === "medium" ? 1.5 : 1) - storedHintsUsed * 50 - storedMistakes * 25))

          await playSessionRepository.complete(session.sessionId, {
            correct: verifyResult.correctCells,
            total: verifyResult.totalCellsRequired,
            accuracy: verifyResult.accuracy,
            elapsedTime,
            moves,
            mistakes: storedMistakes,
            hintsUsed: storedHintsUsed,
            score,
          }, grid, userId, guestId)

          return { hasActiveSession: false }
        }
      } catch (e) {
        // auto-complete failure is non-fatal; return active session
      }
    }

    const puzzle = await NonogramPuzzle.findOne({ puzzleId: session.puzzleId }).lean()
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
    await this.pruneExpiredSessions()
    const session = await playSessionRepository.findActiveDailyByChallenge(dailyChallengeId, userId, guestId)
    if (!session) {
      return { hasActiveSession: false }
    }

    const grid: string[][] = Array.isArray(session.grid) ? session.grid : []
    const size = session.grid?.[0]?.length || 0
    const filledCount = grid.flat().filter((c) => c === "filled").length
    if (size > 0 && filledCount > 0) {
      try {
        const verifyResult = await verificationEngine.verifyCompletion(session.puzzleId, grid)
        if (verifyResult.isComplete) {
          const storedMistakes = session.mistakes || 0
          const storedHintsUsed = session.hintsUsed || 0
          const score = Math.max(0, Math.round(verifyResult.accuracy * 10 * (session.difficulty === "hard" ? 2 : session.difficulty === "medium" ? 1.5 : 1) - storedHintsUsed * 50 - storedMistakes * 25))

          await playSessionRepository.complete(session.sessionId, {
            correct: verifyResult.correctCells,
            total: verifyResult.totalCellsRequired,
            accuracy: verifyResult.accuracy,
            elapsedTime: session.elapsedTime || 0,
            moves: session.moves || 0,
            mistakes: storedMistakes,
            hintsUsed: storedHintsUsed,
            score,
          }, grid, userId, guestId)
          return { hasActiveSession: false }
        }
      } catch (e) {
        // auto-complete failure is non-fatal; return active session
      }
    }

    const puzzle = await NonogramPuzzle.findOne({ puzzleId: session.puzzleId }).lean()
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

    const total = await NonogramPlaySession.countDocuments(filter)
    const sessions = await NonogramPlaySession.find(filter)
      .sort({ lastSaveAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 20)
      .lean()

    return { sessions: sessions.map(s => toSafeSession(s)), total }
  }

  async getCompletedPuzzles(actor: Actor, options: { limit?: number; skip?: number } = {}) {
    const guestId = this.actorGuestId(actor)
    const filter: Record<string, unknown> = { status: "completed" as const }
    if (guestId) {
      filter.guestId = guestId
    } else {
      filter.userId = actor.id
    }
    const total = await NonogramPlaySession.countDocuments(filter)
    const sessions = await NonogramPlaySession.find(filter)
      .sort({ completedAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 20)
      .lean()

    return { sessions: sessions.map(s => toSafeSession(s)), total }
  }

  async getPlayerStats(actor: Actor) {
    if (actor.type === "guest") {
      return null
    }
    const { statisticsService } = await import("./StatisticsService")
    return statisticsService.getUserStats(actor.id)
  }
}

export const sessionService = new SessionService()