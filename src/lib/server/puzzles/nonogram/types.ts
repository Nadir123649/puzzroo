export type NonogramDifficulty = 'easy' | 'medium' | 'hard' | 'expert'
export type SessionStatus = 'playing' | 'paused' | 'completed' | 'abandoned'
export type CellState = 'empty' | 'filled' | 'marked' | 'error'

export interface VerificationResult {
  isComplete: boolean
  totalCellsRequired: number
  correctCells: number
  incorrectCells: number
  accuracy: number
  mistakes: number
  rowValidation: Array<'correct' | 'incorrect' | 'pending'>
  columnValidation: Array<'correct' | 'incorrect' | 'pending'>
}

export interface SafeSessionResponse {
  sessionId: string
  puzzleId: string
  gameType?: "nonogram" | "daily_challenge"
  dailyChallengeId?: string | null
  difficulty: NonogramDifficulty
  sessionStatus: SessionStatus
  grid: string[][]
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
  result?: {
    correct?: number
    total?: number
    accuracy: number
    completedAt?: string | null
    elapsedTime: number
    moves: number
    mistakes: number
    hintsUsed: number
    score: number
  } | null
}

export interface SaveProgressResponse {
  sessionId: string
  sessionStatus: SessionStatus
  lastSavedAt: string
  moves: number
  mistakes: number
  hintsUsed: number
  elapsedTime: number
  progress: { filledCells: number; totalBlanks: number; percentage: number }
}

export interface CompleteSessionResponse {
  isCompleted: boolean
  result: {
    sessionId: string
    puzzleId: string
    difficulty: NonogramDifficulty
    completedAt: string
    elapsedTime: number
    moves: number
    mistakes: number
    hintsUsed: number
    score: number
    accuracy: number
  } | null
  verification: {
    accuracy: number
    isComplete: boolean
    totalCellsRequired: number
    correctCells: number
    incorrectCells: number
  }
  session?: { elapsedTime: number; moves: number; mistakes: number; hintsUsed: number }
}

export interface ContinuePlayingInfo {
  hasActiveSession: boolean
  session?: SafeSessionResponse
  puzzle?: {
    id: string
    title: string
    difficulty: NonogramDifficulty
    size: number
    category: string
    estimatedTime: number
    rowClues: { values: number[] }[]
    columnClues: { values: number[] }[]
  }
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
  favoriteDifficulty: NonogramDifficulty | null
  perDifficulty: Record<string, { played: number; completed: number; bestTime: number; averageTime: number }>
}

export interface SafePuzzleResponse {
  id: string
  game: string
  difficulty: NonogramDifficulty
  size: number
  title?: string
  category?: string
  rowClues: any
  columnClues: any
  solution: number[][]
  hash?: string
  createdAt?: Date | string
  updatedAt?: Date | string
  estimatedTime: number
}

export interface ProgressInfo {
  filledCells: number
  totalBlanks: number
  percentage: number
}

export interface CompletionResult {
  isComplete: boolean
  accuracy: number
  correctCells: number
  totalCells: number
}
