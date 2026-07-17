/**
 * Universal Puzzle Completion Tracking System
 * Stores completed puzzles for all games in localStorage
 * SSR-safe with hydration protection
 */

export type GameType = 'sudoku' | 'crossmath' | 'nonogram' | 'tangram'

const STORAGE_KEYS = {
  sudoku: 'puzzroo_sudoku_completed',
  crossmath: 'puzzroo_crossmath_completed',
  nonogram: 'puzzroo_nonogram_completed',
  tangram: 'puzzroo_tangram_completed',
} as const

export interface CompletionRecord {
  puzzleId: string
  completedAt: number // timestamp
  time?: number // seconds
  hintsUsed?: number
  score?: number
  difficulty?: string
}

/**
 * Get all completed puzzles for a specific game
 * SSR-safe
 */
export function getCompletedPuzzles(gameType: GameType): CompletionRecord[] {
  if (typeof window === 'undefined') return []
  
  try {
    const key = STORAGE_KEYS[gameType]
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

/**
 * Check if puzzle is completed
 * SSR-safe
 */
export function isPuzzleCompleted(gameType: GameType, puzzleId: string): boolean {
  const completed = getCompletedPuzzles(gameType)
  return completed.some((r) => r.puzzleId === puzzleId)
}

/**
 * Mark puzzle as completed
 * SSR-safe
 */
export function markPuzzleCompleted(
  gameType: GameType,
  puzzleId: string,
  metadata: {
    time?: number
    hintsUsed?: number
    score?: number
    difficulty?: string
  } = {}
): void {
  if (typeof window === 'undefined') return

  try {
    const completed = getCompletedPuzzles(gameType)
    
    // Don't add duplicate
    if (completed.some((r) => r.puzzleId === puzzleId)) {
      return
    }

    const record: CompletionRecord = {
      puzzleId,
      completedAt: Date.now(),
      ...metadata,
    }

    completed.push(record)
    const key = STORAGE_KEYS[gameType]
    localStorage.setItem(key, JSON.stringify(completed))
  } catch (error) {
    console.error('Failed to mark puzzle completed:', error)
  }
}

/**
 * Get completed puzzle IDs as Set
 * SSR-safe
 */
export function getCompletedPuzzleIds(gameType: GameType): Set<string> {
  const completed = getCompletedPuzzles(gameType)
  return new Set(completed.map((r) => r.puzzleId))
}

/**
 * Get completion stats for a game
 * SSR-safe
 */
export function getCompletionStats(gameType: GameType) {
  const completed = getCompletedPuzzles(gameType)
  
  const timesWithValue = completed.filter(r => r.time && r.time > 0).map(r => r.time!)
  
  return {
    total: completed.length,
    bestTime: timesWithValue.length > 0 ? Math.min(...timesWithValue) : 0,
    averageTime: timesWithValue.length > 0 
      ? Math.floor(timesWithValue.reduce((sum, t) => sum + t, 0) / timesWithValue.length)
      : 0,
    totalHintsUsed: completed.reduce((sum, r) => sum + (r.hintsUsed || 0), 0),
  }
}

/**
 * Clear all completion data for a game
 * SSR-safe
 */
export function clearCompletionData(gameType: GameType): void {
  if (typeof window === 'undefined') return
  
  try {
    const key = STORAGE_KEYS[gameType]
    localStorage.removeItem(key)
  } catch (error) {
    console.error('Failed to clear completion data:', error)
  }
}

/**
 * Get completion record for a specific puzzle
 * SSR-safe
 */
export function getCompletionRecord(gameType: GameType, puzzleId: string): CompletionRecord | undefined {
  const completed = getCompletedPuzzles(gameType)
  return completed.find((r) => r.puzzleId === puzzleId)
}
