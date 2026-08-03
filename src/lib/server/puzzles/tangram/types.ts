export type SessionStatus = 'playing' | 'paused' | 'completed' | 'abandoned'

export type TangramDifficulty = 'easy' | 'medium' | 'hard'

export type TangramGameType = 'tangram' | 'daily_challenge'

export interface TangramPieceStateRecord {
  pieceId: string
  position: { x: number; y: number }
  rotation: number
  flipped?: boolean
  placed?: boolean
  snapped?: boolean
}

export interface TangramSession {
  sessionId: string
  userId?: string
  guestId?: string
  gameType: TangramGameType
  dailyChallengeId?: string | null
  puzzleId: string
  difficulty: TangramDifficulty
  status: SessionStatus
  pieceStates: TangramPieceStateRecord[]
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
  piecesCorrect: number
  totalPieces: number
  completedAt: Date
  elapsedTime: number
  moves: number
  mistakes: number
  hintsUsed: number
  score: number
}

export interface TangramVerificationResult {
  isComplete: boolean
  valid: boolean
  accuracy: number
  piecesCorrect: number
  totalPieces: number
  pieceResults: {
    pieceId: string
    correct: boolean
    positionMatch: boolean
    rotationMatch: boolean
    error?: string
  }[]
  errors: string[]
  coverage?: {
    covered: boolean
    coverageRatio: number
    errors: string[]
  }
}

export interface SafeSessionResponse {
  sessionId: string
  puzzleId: string
  gameType: TangramGameType
  dailyChallengeId: string | null
  difficulty: TangramDifficulty
  sessionStatus: SessionStatus
  pieceStates: TangramPieceStateRecord[]
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
  piecesCorrect: number
  totalPieces: number
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

export interface SafePuzzleResponse {
  id: string
  difficulty: TangramDifficulty
  pieceShapeIds: string[]
  individualPiecePolygons: any[]
  fullPolygon: any[]
  metadata?: any
}
