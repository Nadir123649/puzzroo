// Type definitions for completion
export interface CompletionRecord {
  puzzleId: string
  completedAt: number
  time?: number
  hintsUsed?: number
  score?: number
  difficulty?: string
}

export type GameType = 'sudoku' | 'crossmath' | 'nonogram' | 'tangram'

export interface GameStats {
  gamesPlayed: number
  completed: number
  currentStreak: number
  completionRate: string
  recentActivity: any[]
}

export function getCompletedPuzzleIds(gameType: GameType): Set<string> {
  return new Set()
}

export function markPuzzleCompleted(
  gameType: GameType,
  puzzleId: string,
  metadata: {
    time?: number
    hintsUsed?: number
    score?: number
    difficulty?: string
  } = {}
): void {}
