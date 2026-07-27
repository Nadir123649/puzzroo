import type { SessionStatus } from "../types"

export type TangramDifficulty = 'easy' | 'medium' | 'hard' | 'expert'

export interface TangramSession {
  sessionId: string
  userId: string
  puzzleId: string
  difficulty: TangramDifficulty
  status: SessionStatus
  grid: any[][]
  startedAt: Date
  pausedAt?: Date | null
  completedAt?: Date | null
  abandonedAt?: Date | null
  lastSaveAt: Date
  isReplay: boolean
  restartCount: number
  result?: TangramSessionResult | null
}

export interface TangramSessionResult {
  accuracy: number
  completedAt: Date
  elapsedTime: number
  moves: number
  mistakes: number
  hintsUsed: number
  score: number
}

export interface TangramVerificationResult {
  isComplete: boolean
  totalCellsRequired: number
  correctCells: number
  incorrectCells: number
  accuracy: number
  mistakes: number
  rowValidation: Array<'correct' | 'incorrect' | 'pending'>
  columnValidation: Array<'correct' | 'incorrect' | 'pending'>
  pieces: {
    id: string
    shape: number[][]
    isCorrect: boolean
    errors?: {
      cellId: number
      type: 'position' | 'overlap' | 'rotation' | 'scale'
      severity: 'critical' | 'error' | 'warning'
    }[]
  }[]
}

export interface SafeSessionResponse {
  sessionId: string
  puzzleId: string
  difficulty: TangramDifficulty
  sessionStatus: SessionStatus
  grid: any[][]
  mistakes: number
  hintsUsed: number
  moves: number
  elapsedTime: number
  startedAt: string
  pausedAt?: string | null
  completedAt?: string | null
  abandonedAt?: string | null
  lastSaveAt: string
  isReplay: boolean
  restartCount: number
  result?: TangramSessionResult | null
  puzzle?: TangramPuzzleResponse
}

export interface TangramPuzzleResponse {
  id: string
  difficulty: TangramDifficulty
  pieceShapeIds: string[]
  individualPiecePolygons: number[][][]
  fullPolygon: number[][]
  metadata?: {
    category?: string
    tags?: string[]
    pieceCount?: number
  }
}

export interface SaveProgressResponse {
  sessionId: string
  sessionStatus: SessionStatus
  lastSavedAt: string
  moves: number
  mistakes: number
  hintsUsed: number
  elapsedTime: number
  progress: ProgressInfo
}

export interface ProgressInfo {
  filledCells: number
  totalPieces: number
  percentage: number
}

export interface CompleteSessionResponse {
  isCompleted: boolean
  result: CompletionResult | null
  verification: TangramVerificationResult
  session?: IncompleteSessionInfo
}

export interface CompletionResult {
  sessionId: string
  puzzleId: string
  difficulty: TangramDifficulty
  completedAt: string
  elapsedTime: number
  moves: number
  mistakes: number
  hintsUsed: number
  score: number
  accuracy: number
}

export interface IncompleteSessionInfo {
  elapsedTime: number
  moves: number
  mistakes: number
  hintsUsed: number
}

export interface PlayerStats {
  totalPlayed: number
  totalCompleted: number
  totalAbandoned: number
  totalTime: number
  currentStreak: number
  longestStreak: number
  bestTime: number
  averageTime: number
  averageAccuracy: number
  favoriteDifficulty: TangramDifficulty | null
}