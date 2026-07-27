import { playSessionRepository } from "./PlaySessionRepository"
import { verificationEngine } from "./VerificationEngine"
import { randomPuzzleEngine } from "./RandomPuzzleEngine"
import NonogramPuzzle from "@/lib/server/models/NonogramPuzzle"
import NonogramPlaySession from "@/lib/server/models/NonogramPlaySession"
import type { SafeSessionResponse, SafePuzzleResponse, SaveProgressResponse, ProgressInfo, CompleteSessionResponse, CompletionResult } from "../types"

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
    sessionId: session._id?.toString() || session.sessionId,
    puzzleId: session.puzzleId,
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
  async startSession(input: any) {
    const puzzle = await NonogramPuzzle.findById(input.puzzleId)
    if (!puzzle) throw new Error("puzzle_not_found")

    const puzzleDoc = await NonogramPlaySession.findByUserAndPuzzle(input.userId, input.puzzleId)
    if (puzzleDoc && puzzleDoc.status === "completed") {
      throw new Error("already_completed")
    }

    const newSession = await playSessionRepository.create({
      userId: input.userId,
      puzzleId: input.puzzleId,
      difficulty: input.difficulty || puzzle.difficulty,
      blanks: [],
      availableNumbers: [],
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
    grid: string[][],
    elapsedTime: number,
    hintsUsed: number,
    mistakes: number,
    moves: number
  ) {
    const session = await this.getSession(sessionId, userId)
    const progress = computeProgress(grid, [])

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
    grid: string[][],
    elapsedTime: number,
    hintsUsed: number,
    mistakes: number,
    moves: number,
    score: number
  ) {
    const session = await this.getSession(sessionId, userId)

    let result: CompletionResult
    if (grid && grid.length > 0) {
      const verification = await verificationEngine.verifyCompletion(session.puzzleId, grid)
      result = {
        isComplete: verification.isComplete,
        accuracy: verification.accuracy,
        correctCells: verification.correctCells,
        totalCells: verification.totalCellsRequired,
      }
    } else {
      result = {
        isComplete: true,
        accuracy: 100,
        correctCells: 0,
        totalCells: 0,
      }
    }

    const completionResult = {
      isComplete: result.isComplete,
      accuracy: result.accuracy,
      correctCells: result.correctCells,
      totalCells: result.totalCells,
      completedAt: new Date(),
    }

    const sessionResult = await playSessionRepository.complete(sessionId, {
      correct: result.correctCells,
      total: result.totalCells,
      accuracy: result.accuracy,
      elapsedTime,
      moves,
      mistakes,
      hintsUsed,
      score,
    })

    return toSafeSession(sessionResult)
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

    const result = await playSessionRepository.saveGrid(sessionId, {}, 0, 0)
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
    const puzzleDoc = await NonogramPuzzle.findById(puzzleId)
    if (!puzzleDoc) throw new Error("puzzle_not_found")

    const result = await playSessionRepository.create({
      userId,
      puzzleId,
      difficulty: puzzleDoc.difficulty,
      blanks: [],
      availableNumbers: [],
    })

    return toSafeSession(result)
  }

  async getContinuePlaying(userId: string, puzzleId?: string) {
    if (puzzleId) {
      const session = await playSessionRepository.findByUserAndPuzzle(userId, puzzleId)
      if (!session) return null
      return toSafeSession(session)
    }

    const session = await playSessionRepository.findByUserAndStatus(userId, ["playing", "paused"])
    if (!session) return null
    return toSafeSession(session)
  }

  async getSessionByUser(userId: string, status?: string, limit = 20) {
    const query: any = { userId }
    if (status) query.status = status

    const sessions = await playSessionRepository.findByUser(userId, { status, limit })
    const safeSessions = sessions.sessions.map(toSafeSession)

    return {
      sessions: safeSessions,
      total: sessions.total,
    }
  }
}

export const sessionService = new SessionService()