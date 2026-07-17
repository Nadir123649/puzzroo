// Nonogram LocalStorage Utilities
// Phase 2: Save/load game state and statistics

import type { SavedGameState, GameStats } from './types'

const STORAGE_KEYS = {
  GAME_STATE: 'puzzroo_nonogram_game',
  STATS: 'puzzroo_nonogram_stats',
  SETTINGS: 'puzzroo_nonogram_settings',
} as const

/**
 * Save current game state
 */
export function saveGameState(state: SavedGameState): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(STORAGE_KEYS.GAME_STATE, JSON.stringify(state))
  } catch (error) {
    console.warn('Failed to save game state:', error)
  }
}

/**
 * Load saved game state
 */
export function loadGameState(): SavedGameState | null {
  if (typeof window === 'undefined') return null
  
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.GAME_STATE)
    if (!saved) return null
    
    const state = JSON.parse(saved) as SavedGameState
    
    // Validate state has required fields
    if (!state.grid || !state.puzzleId || !state.difficulty) {
      return null
    }
    
    return state
  } catch (error) {
    console.warn('Failed to load game state:', error)
    return null
  }
}

/**
 * Clear saved game state
 */
export function clearGameState(): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.removeItem(STORAGE_KEYS.GAME_STATE)
  } catch (error) {
    console.warn('Failed to clear game state:', error)
  }
}

/**
 * Load game statistics
 */
export function loadGameStats(): GameStats {
  if (typeof window === 'undefined') {
    return {
      puzzlesCompleted: 0,
      bestTime: 0,
      totalPlayTime: 0,
      currentStreak: 0,
    }
  }
  
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.STATS)
    if (!saved) {
      return {
        puzzlesCompleted: 0,
        bestTime: 0,
        totalPlayTime: 0,
        currentStreak: 0,
      }
    }
    
    return JSON.parse(saved) as GameStats
  } catch (error) {
    console.warn('Failed to load stats:', error)
    return {
      puzzlesCompleted: 0,
      bestTime: 0,
      totalPlayTime: 0,
      currentStreak: 0,
    }
  }
}

/**
 * Save game statistics
 */
export function saveGameStats(stats: GameStats): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(stats))
  } catch (error) {
    console.warn('Failed to save stats:', error)
  }
}

/**
 * Update statistics after completing a puzzle
 */
export function updateStatsOnCompletion(completionTime: number): GameStats {
  const currentStats = loadGameStats()
  
  const newStats: GameStats = {
    puzzlesCompleted: currentStats.puzzlesCompleted + 1,
    bestTime: currentStats.bestTime === 0 
      ? completionTime 
      : Math.min(currentStats.bestTime, completionTime),
    totalPlayTime: currentStats.totalPlayTime + completionTime,
    currentStreak: currentStats.currentStreak + 1,
  }
  
  saveGameStats(newStats)
  return newStats
}

/**
 * Reset streak (on failed puzzle or break)
 */
export function resetStreak(): void {
  const currentStats = loadGameStats()
  saveGameStats({
    ...currentStats,
    currentStreak: 0,
  })
}

/**
 * Get hint limits by difficulty
 */
export function getHintLimits(difficulty: string): number {
  switch (difficulty) {
    case 'easy':
      return 5
    case 'medium':
      return 3
    case 'hard':
      return 2
    default:
      return 3
  }
}
