/**
 * Puzzle Completion Tracking System
 * Stores completed puzzles in localStorage
 * SSR-safe with hydration protection
 */

const COMPLETION_KEY = 'puzzroo_nonogram_completed'

export interface CompletionRecord {
  puzzleId: string
  completedAt: number // timestamp
  time: number // seconds
  hintsUsed: number
}

/**
 * Get all completed puzzles
 * SSR-safe
 */
export function getCompletedPuzzles(): CompletionRecord[] {
  if (typeof window === 'undefined') return []
  
  try {
    const data = localStorage.getItem(COMPLETION_KEY)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

/**
 * Check if puzzle is completed
 * SSR-safe
 */
export function isPuzzleCompleted(puzzleId: string): boolean {
  const completed = getCompletedPuzzles()
  return completed.some((r) => r.puzzleId === puzzleId)
}

/**
 * Mark puzzle as completed
 * SSR-safe
 */
export function markPuzzleCompleted(
  puzzleId: string,
  time: number,
  hintsUsed: number
): void {
  if (typeof window === 'undefined') return

  try {
    const completed = getCompletedPuzzles()
    
    // Don't add duplicate
    if (completed.some((r) => r.puzzleId === puzzleId)) {
      return
    }

    const record: CompletionRecord = {
      puzzleId,
      completedAt: Date.now(),
      time,
      hintsUsed,
    }

    completed.push(record)
    localStorage.setItem(COMPLETION_KEY, JSON.stringify(completed))
  } catch (error) {
    console.error('Failed to mark puzzle completed:', error)
  }
}

/**
 * Get completion stats
 * SSR-safe
 */
export function getCompletionStats() {
  const completed = getCompletedPuzzles()
  
  return {
    total: completed.length,
    bestTime: completed.length > 0 ? Math.min(...completed.map((r) => r.time)) : 0,
    averageTime: completed.length > 0 
      ? Math.floor(completed.reduce((sum, r) => sum + r.time, 0) / completed.length)
      : 0,
    totalHintsUsed: completed.reduce((sum, r) => sum + r.hintsUsed, 0),
  }
}

/**
 * Get completed puzzle IDs as Set
 * SSR-safe
 */
export function getCompletedPuzzleIds(): Set<string> {
  const completed = getCompletedPuzzles()
  return new Set(completed.map((r) => r.puzzleId))
}

/**
 * Clear all completion data
 * SSR-safe
 */
export function clearCompletionData(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(COMPLETION_KEY)
  } catch (error) {
    console.error('Failed to clear completion data:', error)
  }
}
