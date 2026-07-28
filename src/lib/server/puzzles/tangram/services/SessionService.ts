import { playSessionRepository } from "./PlaySessionRepository"
import { verificationEngine } from "./VerificationEngine"
import { randomPuzzleEngine } from "./RandomPuzzleEngine"
import TangramPuzzle from "@/lib/server/models/TangramPuzzle"
import TangramPlaySession from "@/lib/server/models/TangramPlaySession"
import type { SafeSessionResponse, SafePuzzleResponse, SaveProgressResponse, ProgressInfo, CompleteSessionResponse, CompletionResult, TangramVerificationResult } from "../types"

function computeProgress(grid: any[][], pieces: any[]): ProgressInfo {
  const filled = pieces.filter(p => p.isPlaced).length
  return {
    filledCells: filled,
    totalPieces: pieces.length,
    percentage: pieces.length > 0 ? Math.round((filled / pieces.length) * 100) : 100,
  }
}

function toSafeSession(session: Record<string, any>): SafeSessionResponse {
  const gridRaw = session.grid || []
  const grid: any[][] = Array.isArray(gridRaw) ? gridRaw : []

  return {
    sessionId: session._id?.toString() || session.sessionId,
    puzzleId: session.puzzleId,
    difficulty: session.difficulty,
    sessionStatus: session.status,
    grid,
    mistakes: session.mistakes || 0,
    hintsUsed: session.hintsUsed || 0,
    moves: session.moves || 0,
    elapsedTime: session.elapsedTime || 0,
    startedAt: session.startedAt?.toISOString?.() || session.startedAt,
    pausedAt: session.pausedAt?.toISOString?.() || session.pausedAt || null,
    completedAt: session.completedAt?.toISOString?.() || session.completedAt || null,
    abandonedAt: session.abandonedAt?.toISOString?.() || session.abandonedAt || null,
    lastSaveAt: session.lastSaveAt?.toISOString?.() || session.lastSaveAt,
    isReplay: session.isReplay || false,
    restartCount: session.restartCount || 0,
    result: session.result || null,
    puzzle: session.puzzle ? {
      id: session.puzzle.puzzleId,
      difficulty: session.puzzle.difficulty,
      pieceShapeIds: session.puzzle.pieceShapeIds || [],
      individualPiecePolygons: session.puzzle.individualPiecePolygons || [],
      fullPolygon: session.puzzle.fullPolygon || [],
      metadata: session.puzzle.metadata,
    } : undefined,
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
  async startSession(input: any) {
    const puzzle = await TangramPuzzle.findById(input.puzzleId)
    if (!puzzle) throw new Error("puzzle_not_found")

    const puzzleDoc = await playSessionRepository.findByUserAndPuzzle(input.userId, input.puzzleId)
    if (puzzleDoc && puzzleDoc.status === "completed") {
      throw new Error("already_completed")
    }

    const newSession = await playSessionRepository.create({
      userId: input.userId,
      puzzleId: input.puzzleId,
      difficulty: input.difficulty || puzzle.difficulty,
    })

    return toSafeSession(newSession)
  }

  async getSession(sessionId: string, userId: string) {
    const session = await playSessionRepository.findById(sessionId)
    if (!session) throw new Error("session_not_found")
    if (session.userId.toString() !== userId) throw new Error("unauthorized")

    return toSafeSession(session)
  }

  async getSessionById(sessionId: string, userId: string) {
    return this.getSession(sessionId, userId)
  }

  async saveProgress(
    sessionId: string,
    userId: string,
    grid: any[][],
    pieces: any[],
    elapsedTime: number,
    hintsUsed: number,
    mistakes: number,
    moves: number
  ) {
    const session = await this.getSession(sessionId, userId)
    const progress = computeProgress(grid, pieces)

    const result = await playSessionRepository.saveProgress(
      sessionId,
      userId,
      grid,
      elapsedTime,
      hintsUsed,
      mistakes,
      moves
    )

    return toSafeSession(result)
  }

  async completeSession(
    sessionId: string,
    userId: string,
    grid: any[][],
    pieces: any[],
    elapsedTime: number,
    hintsUsed: number,
    mistakes: number,
    moves: number,
    _score?: number
  ) {
    const session = await this.getSession(sessionId, userId)

    let result: { isComplete: boolean; accuracy: number; correctCells: number; totalCells: number }
    let verification: TangramVerificationResult

    if (grid && grid.length > 0) {
      verification = await verificationEngine.verifyCompletion(session.puzzleId, grid, pieces)
      result = {
        isComplete: verification.isComplete,
        accuracy: verification.accuracy,
        correctCells: verification.correctCells,
        totalCells: verification.totalCellsRequired,
      }
    } else if (pieces && pieces.length > 0) {
      verification = await verificationEngine.verifyCompletion(session.puzzleId, grid, pieces)
      result = {
        isComplete: verification.isComplete,
        accuracy: verification.accuracy,
        correctCells: verification.correctCells,
        totalCells: verification.totalCellsRequired,
      }
    } else {
      result = {
        isComplete: false,
        accuracy: 0,
        correctCells: 0,
        totalCells: 0,
      }
      verification = {
        isComplete: false,
        totalCellsRequired: 0,
        correctCells: 0,
        incorrectCells: 0,
        accuracy: 0,
        mistakes: 0,
        rowValidation: [],
        columnValidation: [],
        pieces: []
      }
    }

    const difficultyMultiplier: Record<string, number> = { easy: 1, medium: 1.5, hard: 2, expert: 3 };
    const multiplier = difficultyMultiplier[session.difficulty] ?? 1;
    const score = Math.max(0, Math.round(result.accuracy * 10 * multiplier - hintsUsed * 50 - mistakes * 25));

    const completionResult = {
      isComplete: result.isComplete,
      accuracy: result.accuracy,
      correctCells: result.correctCells,
      totalCells: result.totalCells,
      completedAt: new Date(),
    }

    const sessionResult = await playSessionRepository.complete(sessionId, {
      accuracy: result.accuracy,
      elapsedTime,
      moves,
      mistakes,
      hintsUsed,
      score,
    })

    return {
      ...toSafeSession(sessionResult),
      verification,
      completionResult,
    }
  }

  async pauseSession(sessionId: string, userId: string) {
    const session = await this.getSession(sessionId, userId)

    if (session.sessionStatus === "completed") throw new Error("already_completed")
    if (session.sessionStatus === "abandoned") throw new Error("session_abandoned")

    const result = await playSessionRepository.updateStatus(sessionId, "paused")
    return toSafeSession(result)
  }

  async resumeSession(sessionId: string, userId: string) {
    const session = await this.getSession(sessionId, userId)

    if (session.sessionStatus === "completed") throw new Error("already_completed")
    if (session.sessionStatus === "abandoned") throw new Error("session_abandoned")
    if (session.sessionStatus === "playing") return toSafeSession(session)

    const result = await playSessionRepository.updateStatus(sessionId, "playing")
    return toSafeSession(result)
  }

  async restartSession(sessionId: string, userId: string) {
    const session = await this.getSession(sessionId, userId)

    if (session.sessionStatus === "completed") {
      await playSessionRepository.incrementRestartCount(sessionId)
    }

    const result = await playSessionRepository.saveGrid(sessionId, [], 0, 0)
    await playSessionRepository.updateStatus(sessionId, "playing")

    return toSafeSession(result)
  }

  async abandonSession(sessionId: string, userId: string) {
    const session = await this.getSession(sessionId, userId)

    if (session.sessionStatus === "completed") throw new Error("already_completed")

    const result = await playSessionRepository.abandon(sessionId)
    return toSafeSession(result)
  }

  async replaySession(userId: string, puzzleId: string) {
    const puzzleDoc = await TangramPuzzle.findById(puzzleId)
    if (!puzzleDoc) throw new Error("puzzle_not_found")

    const result = await playSessionRepository.create({
      userId,
      puzzleId,
      difficulty: puzzleDoc.difficulty,
    })

    return toSafeSession(result)
  }

  async getSessionByUser(userId: string, status?: string, limit = 20) {
    const query: any = { userId }
    if (status) query.status = status

    const sessions = await playSessionRepository.findByUser(userId, { status: status as any, limit })
    const safeSessions = sessions.sessions.map(toSafeSession)

    return {
      sessions: safeSessions,
      total: sessions.total,
    }
  }
}

export const sessionService = new SessionService()