export type SessionStatus = 'active' | 'paused' | 'completed' | 'abandoned'

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'

export interface PlayerCell {
  state: 'empty' | 'filled' | 'marked'
}

export interface HintUsage {
  hintCount: number
  hintPositions: Array<{ row: number; col: number }>
}

export interface VerificationResult {
  isComplete: boolean
  totalCellsRequired: number
  correctCells: number
  incorrectCells: number
  accuracy: number
  mistakes: number
  rowValidation: ValidationStatus[]
  columnValidation: ValidationStatus[]
}

export type ValidationStatus = 'correct' | 'incorrect' | 'pending'

export interface SessionResult {
  sessionId: string
  puzzleId: string
  difficulty: Difficulty
  status: SessionStatus
  elapsedSeconds: number
  hintsUsed: number
  mistakeCount: number
  accuracy: number
  completedAt?: string
}

export interface UserGameStats {
  totalPlayed: number
  totalCompleted: number
  totalAbandoned: number
  totalTime: number
  currentStreak: number
  longestStreak: number
  bestTime: number
  averageTime: number
  averageAccuracy: number
  favoriteDifficulty: string | null
  perDifficulty: Record<string, DifficultyStats>
}

export interface DifficultyStats {
  played: number
  completed: number
  bestTime: number
  averageTime: number
}

export interface PuzzleStats {
  puzzleId: string
  difficulty: Difficulty
  size: number
  totalAttempts: number
  totalCompletions: number
  totalAbandons: number
  averageTime: number
  averageAccuracy: number
  completionRate: number
}

export interface DailyChallengeInfo {
  date: string
  puzzleId: string
  difficulty: Difficulty
  title: string
  status: SessionStatus | 'not_started'
  elapsedSeconds: number
  accuracy: number
  hintsUsed: number
  mistakes: number
  completedAt?: string
}

export interface SessionSummary {
  sessionId: string
  puzzleId: string
  puzzleTitle: string
  difficulty: Difficulty
  status: SessionStatus
  elapsedSeconds: number
  hintsUsed: number
  mistakeCount: number
  accuracy: number
  createdAt: string
  completedAt?: string
}

export interface ContinuePlayingInfo {
  hasActiveSession: boolean
  session?: SessionSummary
  puzzle?: {
    id: string
    title: string
    difficulty: Difficulty
    size: number
    category: string
    estimatedTime: number
    rowClues: { values: number[] }[]
    columnClues: { values: number[] }[]
  }
}
