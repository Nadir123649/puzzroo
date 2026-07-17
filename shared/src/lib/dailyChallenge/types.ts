/**
 * Daily Challenge Types
 */

export type DailyChallengeDifficulty = 'easy' | 'medium' | 'hard'

export type DailyChallengeShape = 
  | 'classic'
  | 'cross'
  | 'snake'
  | 'diamond'
  | 'maze'
  | 'spiral'

export type DailyChallengeStatus = 
  | 'not-started'
  | 'in-progress'
  | 'completed'
  | 'locked'

export interface DailyChallenge {
  id: string
  date: Date
  dateString: string // Format: MM-DD-YY
  dayName: string // e.g., "Monday"
  difficulty: DailyChallengeDifficulty
  shape: DailyChallengeShape
  status: DailyChallengeStatus
  gameId: 'sudoku' | 'cross-math' | 'nonogram' | 'tangram'
  puzzleData: any // Actual puzzle configuration
}

export interface PastPuzzleFilter {
  status: 'all' | 'not-started' | 'in-progress' | 'completed'
  dateRange?: {
    start: Date
    end: Date
  }
}
