export type CrossMathDifficulty = 'easy' | 'medium' | 'hard'

export type SessionStatus = 'playing' | 'paused' | 'completed' | 'abandoned'

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
  moves: number
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
  moves: number
  mistakes: number
  hintsUsed: number
  score: number
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

export interface EquationError {
  equationId: string
  direction: 'horizontal' | 'vertical'
  expectedResult: number
  actualResult: number
}

export interface VerifyGridResult {
  isCorrect: boolean
  completed: boolean
  mistakes: number
  maxMistakes: number
  accuracy: number
  equations: EquationResult[]
  errors: EquationError[]
  totalEquations: number
  correctEquations: number
  incorrectEquations: number
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
  solution: Record<string, number>;
  puzzleId?: string;
}

export interface SafeSessionResponse {
  sessionId: string
  puzzleId: string
  gameType: "crossmath" | "daily_challenge"
  dailyChallengeId?: string | null
  difficulty: CrossMathDifficulty
  sessionStatus: SessionStatus
  grid: Record<string, number>
  blanks: string[]
  availableNumbers: number[]
  moves: number
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
  score: number
  result?: SessionResult | null
  puzzle?: SafePuzzleResponse
}

export interface SaveProgressResponse {
  sessionId: string
  sessionStatus: SessionStatus
  lastSavedAt: string
  moves: number
  mistakes: number
  hintsUsed: number
  elapsedTime: number
  score: number
  progress: ProgressInfo
}

export interface ProgressInfo {
  filledCells: number
  totalBlanks: number
  percentage: number
}

export interface IncompleteSessionInfo {
  elapsedTime: number
  moves: number
  mistakes: number
  hintsUsed: number
}

export interface CompleteSessionResponse {
  isCompleted: boolean
  result: CompletionResult | null
  verification: VerificationSummary
  session?: IncompleteSessionInfo
}

export interface CompletionResult {
  sessionId: string
  puzzleId: string
  difficulty: CrossMathDifficulty
  completedAt: string
  elapsedTime: number
  moves: number
  mistakes: number
  hintsUsed: number
  score: number
  accuracy: number
  totalEquations: number
  correctEquations: number
  incorrectEquations: number
}

export interface VerificationSummary {
  isCorrect: boolean
  accuracy: number
  totalEquations: number
  correctEquations: number
  incorrectEquations: number
  errors: EquationError[]
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
  moves: number
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

export const API_VERSION = "1.0.0"
