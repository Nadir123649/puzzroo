import { playSessionRepository } from "./PlaySessionRepository"
import type { PieceStateRecord } from "./PlaySessionRepository"
import { verificationEngine } from "./VerificationEngine"
import TangramPuzzle from "@/lib/server/models/TangramPuzzle"
import TangramPlaySession from "@/lib/server/models/TangramPlaySession"
import GameProgress from "@/lib/server/models/GameProgress"
import UserStatistics from "@/lib/server/models/UserStatistics"
import type { Actor } from "@/app/api/v1/games/tangram/route-helpers"
import type {
  SafeSessionResponse,
  SafePuzzleResponse,
  SaveProgressResponse,
  ProgressInfo,
  CompleteSessionResponse,
  CompletionResult,
  TangramVerificationResult,
} from "../types"

const EXPIRED_SESSION_RETENTION_MS = 90 * 24 * 60 * 60 * 1000

function calculateTangramScore(
  accuracy: number,
  difficulty: string,
  mistakes: number,
  hintsUsed: number
): number {
  const difficultyMultiplier: Record<string, number> = { easy: 1, medium: 1.5, hard: 2 }
  const multiplier = difficultyMultiplier[difficulty] ?? 1
  return Math.max(0, Math.round(accuracy * 10 * multiplier - hintsUsed * 50 - mistakes * 25))
}

function computeProgress(pieceStates: PieceStateRecord[]): ProgressInfo {
  const placed = (pieceStates || []).filter(p => p.placed || p.snapped).length
  return {
    filledCells: placed,
    totalPieces: pieceStates.length,
    percentage: pieceStates.length > 0 ? Math.round((placed / pieceStates.length) * 100) : 100,
  }
}

function toSafeSession(session: Record<string, any>): SafeSessionResponse {
  return {
    sessionId: session.sessionId,
    puzzleId: session.puzzleId,
    gameType: session.gameType || "tangram",
    dailyChallengeId: session.dailyChallengeId || null,
    difficulty: session.difficulty,
    sessionStatus: session.status,
    pieceStates: Array.isArray(session.pieceStates) ? session.pieceStates : [],
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
  return {
    id: doc.puzzleId,
    difficulty: doc.difficulty,
    pieceShapeIds: doc.pieceShapeIds || [],
    individualPiecePolygons: doc.individualPiecePolygons || [],
    fullPolygon: doc.fullPolygon || [],
    metadata: doc.metadata,
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

  async startSession(actor: Actor, puzzleId: string, gameType?: "tangram" | "daily_challenge", dailyChallengeId?: string) {
    const puzzle = await TangramPuzzle.findOne({ puzzleId }).lean()
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
            { userId, gameId: "tangram", puzzleId },
            {
              $set: { difficulty: puzzleDoc.difficulty || "easy", updatedAt: new Date() },
              $inc: { attempts: 1 },
            },
            { upsert: true }
          ),
          UserStatistics.findOneAndUpdate(
            { userId, gameId: "tangram" },
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
    await TangramPlaySession.findOneAndUpdate(
      { sessionId },
      { $set: { status: "paused", pausedAt: new Date() } }
    )
    return this.getSession(sessionId, actor)
  }

  async resumeSession(sessionId: string, actor: Actor) {
    const session = await this.getSession(sessionId, actor)
    if (session.sessionStatus !== "paused") throw new Error("session_not_paused")
    await TangramPlaySession.findOneAndUpdate(
      { sessionId },
      { $set: { status: "playing" } }
    )
    return this.getSession(sessionId, actor)
  }

  async saveProgress(
    sessionId: string,
    actor: Actor,
    pieceStates: PieceStateRecord[],
    elapsedTime: number,
    hintsUsed: number,
    mistakes: number,
    moves: number
  ): Promise<SaveProgressResponse> {
    const userId = this.actorId(actor)
    const guestId = this.actorGuestId(actor)
    const updated = await playSessionRepository.saveProgress(
      sessionId, pieceStates, elapsedTime, hintsUsed, mistakes, moves, userId, guestId
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
      progress: computeProgress(updated.pieceStates || []),
    }
  }

  async verifyPieces(sessionId: string, actor: Actor, pieceStates: PieceStateRecord[]) {
    const session = await this.getSession(sessionId, actor)
    return verificationEngine.verifyCompletion(session.puzzleId, [], pieceStates)
  }

  async completeSession(
    sessionId: string,
    actor: Actor,
    pieceStates: PieceStateRecord[],
    elapsedTime: number,
    hintsUsed: number,
    mistakes: number,
    moves: number
  ): Promise<CompleteSessionResponse> {
    const session = await this.getSession(sessionId, actor)
    if (session.sessionStatus === "completed") throw new Error("already_completed")
    if (session.sessionStatus === "abandoned") throw new Error("session_abandoned")

    const verification: TangramVerificationResult = await verificationEngine.verifyCompletion(
      session.puzzleId, [], pieceStates
    )

    if (!verification.isComplete) {
      return {
        isCompleted: false,
        result: null,
        verification,
        session: { elapsedTime, moves, mistakes, hintsUsed },
      }
    }

    const finalMistakes = Math.max(session.mistakes || 0, mistakes)
    const finalHintsUsed = Math.max(session.hintsUsed || 0, hintsUsed)
    const finalMoves = Math.max(session.moves || 0, moves)
    const score = calculateTangramScore(verification.accuracy, session.difficulty, finalMistakes, finalHintsUsed)

    const userId = this.actorId(actor)
    const guestId = this.actorGuestId(actor)
    const updated = await playSessionRepository.complete(sessionId, {
      accuracy: verification.accuracy,
      piecesCorrect: verification.piecesCorrect,
      totalPieces: verification.totalPieces,
      elapsedTime,
      moves: finalMoves,
      mistakes: finalMistakes,
      hintsUsed: finalHintsUsed,
      score,
    }, pieceStates, userId, guestId)

    if (!updated) throw new Error("already_completed")

    const result: CompletionResult = {
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
      piecesCorrect: verification.piecesCorrect,
      totalPieces: verification.totalPieces,
    }

    return {
      isCompleted: true,
      result,
      verification,
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
    const puzzle = await TangramPuzzle.findOne({ puzzleId }).lean()
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

  async getContinuePlaying(actor: Actor, gameType: "tangram" | "daily_challenge" = "tangram", difficulty?: string) {
    const userId = this.actorId(actor)
    const guestId = this.actorGuestId(actor)
    await this.pruneExpiredSessions()
    const session = await playSessionRepository.findByUserAndStatus(["playing", "paused"], userId, guestId, gameType, difficulty)
    if (!session) {
      return { hasActiveSession: false }
    }

    const pieceStates: PieceStateRecord[] = Array.isArray(session.pieceStates) ? session.pieceStates : []
    const allPlaced = pieceStates.length > 0 && pieceStates.every(p => p.placed || p.snapped)
    if (allPlaced) {
      try {
        const verifyResult = await verificationEngine.verifyCompletion(session.puzzleId, [], pieceStates)
        if (verifyResult.isComplete) {
          const storedMistakes = session.mistakes || 0
          const storedHintsUsed = session.hintsUsed || 0
          const moves = session.moves || 0
          const elapsedTime = session.elapsedTime || 0
          const score = calculateTangramScore(verifyResult.accuracy, session.difficulty, storedMistakes, storedHintsUsed)

          await playSessionRepository.complete(session.sessionId, {
            accuracy: verifyResult.accuracy,
            piecesCorrect: verifyResult.piecesCorrect,
            totalPieces: verifyResult.totalPieces,
            elapsedTime,
            moves,
            mistakes: storedMistakes,
            hintsUsed: storedHintsUsed,
            score,
          }, pieceStates, userId, guestId)

          return { hasActiveSession: false }
        }
      } catch (e) {
        // auto-complete failure is non-fatal; return active session
      }
    }

    const puzzle = await TangramPuzzle.findOne({ puzzleId: session.puzzleId }).lean()
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

    const pieceStates: PieceStateRecord[] = Array.isArray(session.pieceStates) ? session.pieceStates : []
    const allPlaced = pieceStates.length > 0 && pieceStates.every(p => p.placed || p.snapped)
    if (allPlaced) {
      try {
        const verifyResult = await verificationEngine.verifyCompletion(session.puzzleId, [], pieceStates)
        if (verifyResult.isComplete) {
          await playSessionRepository.complete(session.sessionId, {
            accuracy: verifyResult.accuracy,
            piecesCorrect: verifyResult.piecesCorrect,
            totalPieces: verifyResult.totalPieces,
            elapsedTime: session.elapsedTime || 0,
            moves: session.moves || 0,
            mistakes: session.mistakes || 0,
            hintsUsed: session.hintsUsed || 0,
            score: calculateTangramScore(verifyResult.accuracy, session.difficulty, session.mistakes || 0, session.hintsUsed || 0),
          }, pieceStates, userId, guestId)
          return { hasActiveSession: false }
        }
      } catch (e) {
        // auto-complete failure is non-fatal; return active session
      }
    }

    const puzzle = await TangramPuzzle.findOne({ puzzleId: session.puzzleId }).lean()
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

    const total = await TangramPlaySession.countDocuments(filter)
    const sessions = await TangramPlaySession.find(filter)
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
    const total = await TangramPlaySession.countDocuments(filter)
    const sessions = await TangramPlaySession.find(filter)
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
