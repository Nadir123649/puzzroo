export type CrossMathDifficulty = 'easy' | 'medium' | 'hard'

export type SessionStatus = 'active' | 'paused' | 'completed' | 'abandoned'

export type ValidationStatus = 'correct' | 'incorrect' | 'pending'

export interface CrossMathSession {
  sessionId: string
  userId: string
  puzzleId: string
  difficulty: CrossMathDifficulty
  status: SessionStatus
  grid: Record<string, number>
  blanks: string[]
  availableNumbers: number[]
  mistakes: number
  hintsUsed: number
  elapsedTime: number
  startedAt: Date
  pausedAt?: Date | null
  completedAt?: Date | null
  abandonedAt?: Date | null
  lastSaveAt: Date
  isReplay: boolean
  restartCount: number
  result?: SessionResult | null
}

export interface SessionResult {
  correct: number
  total: number
  accuracy: number
  completedAt: Date
  elapsedTime: number
}

export interface VerifyGridRequest {
  grid: Record<string, number>
}

export interface EquationResult {
  equationId: string
  direction: 'horizontal' | 'vertical'
  operands: number[]
  operators: string[]
  expectedResult: number
  actualResult: number
  correct: boolean
}

export interface VerifyGridResult {
  correct: boolean
  completed: boolean
  mistakes: number
  maxMistakes: number
  accuracy: number
  equations: EquationResult[]
  errors: string[]
}

export interface PuzzleSelectionOptions {
  difficulty?: CrossMathDifficulty
  excludeIds?: string[]
  excludeCompleted?: boolean
  excludeActive?: boolean
  excludeAbandoned?: boolean
  excludeDaily?: boolean
}

export interface SafePuzzleResponse {
  id: string;
  difficulty: CrossMathDifficulty;
  patternId: number;
  rows: number;
  columns: number;
  grid: unknown[][];
  availableNumbers: number[];
  maxMistakes: number;
  puzzleId?: string;
}

export interface SafeSessionResponse {
  sessionId: string
  puzzleId: string
  difficulty: CrossMathDifficulty
  status: SessionStatus
  grid: Record<string, number>
  blanks: string[]
  availableNumbers: number[]
  mistakes: number
  hintsUsed: number
  elapsedTime: number
  startedAt: string
  pausedAt?: string | null
  completedAt?: string | null
  abandonedAt?: string | null
  lastSaveAt: string
  isReplay: boolean
  restartCount: number
  result?: SessionResult | null
  puzzle?: SafePuzzleResponse
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
  favoriteDifficulty: CrossMathDifficulty | null
  perDifficulty: Record<string, DifficultyStats>
}

export interface DifficultyStats {
  played: number
  completed: number
  bestTime: number
  averageTime: number
}

export interface SessionSummary {
  sessionId: string
  puzzleId: string
  difficulty: CrossMathDifficulty
  status: SessionStatus
  elapsedTime: number
  hintsUsed: number
  mistakes: number
  accuracy: number
  startedAt: string
  completedAt?: string | null
}

export interface ContinuePlayingInfo {
  hasActiveSession: boolean
  session?: SafeSessionResponse
}

export interface DailyChallengeInfo {
  date: string
  puzzleId: string
  difficulty: CrossMathDifficulty
  status: SessionStatus | 'not_started'
  elapsedTime: number
  accuracy: number
  hintsUsed: number
  mistakes: number
  completedAt?: string | null
}
