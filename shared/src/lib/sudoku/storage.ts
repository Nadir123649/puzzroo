/**
 * Local Storage Utilities for Sudoku Game
 * Handles saving and restoring game state
 */

'use client'

import { SudokuBoard, GameStatus, Difficulty } from './types'

const STORAGE_KEY = 'puzzroo_sudoku_game'
const STORAGE_VERSION = '1.0'

// Check if we're in browser environment
const isBrowser = typeof window !== 'undefined'

export interface SavedGameState {
  version: string
  currentBoard: SudokuBoard
  initialBoard: SudokuBoard
  solution: SudokuBoard
  difficulty: Difficulty
  puzzleId: string
  mistakes: number
  score: number
  time: number
  gameStatus: GameStatus
  savedAt: number
}

function getScopedKey(baseKey: string): string {
  if (!isBrowser) return baseKey
  try {
    const userStr = localStorage.getItem("puzzroo_user")
    if (userStr) {
      const user = JSON.parse(userStr)
      if (user && user.id) {
        return `${baseKey}_${user.id}`
      }
    }
  } catch {}
  return `${baseKey}_guest`
}

const keyFor = (puzzleId?: string, difficulty?: string) => {
  let baseKey = STORAGE_KEY
  if (puzzleId) {
    baseKey = `puzzroo_sudoku_game_${puzzleId}`
  } else if (difficulty) {
    baseKey = `puzzroo_sudoku_game_${difficulty}`
  }
  return getScopedKey(baseKey)
}

/**
 * Save game state to localStorage
 */
export function saveGameState(state: Omit<SavedGameState, 'version' | 'savedAt'>, puzzleId?: string, difficulty?: string): void {
  if (!isBrowser) return
  
  try {
    const dataToSave: SavedGameState = {
      ...state,
      version: STORAGE_VERSION,
      savedAt: Date.now(),
    }
    
    const key = keyFor(puzzleId, difficulty || state.difficulty)
    localStorage.setItem(key, JSON.stringify(dataToSave))
  } catch (error) {
    console.error('Failed to save game state:', error)
  }
}

/**
 * Load game state from localStorage
 */
export function loadGameState(puzzleId?: string, difficulty?: string): SavedGameState | null {
  if (!isBrowser) return null
  
  try {
    const key = keyFor(puzzleId, difficulty)
    const data = localStorage.getItem(key)
    if (!data) return null

    const parsed = JSON.parse(data) as SavedGameState

    // Version check
    if (parsed.version !== STORAGE_VERSION) {
      console.warn('Saved game version mismatch, clearing storage')
      clearGameState(puzzleId, difficulty)
      return null
    }

    // Don't restore completed games
    if (parsed.gameStatus === 'won' || parsed.gameStatus === 'lost') {
      clearGameState(puzzleId, difficulty)
      return null
    }

    return parsed
  } catch (error) {
    console.error('Failed to load game state:', error)
    clearGameState(puzzleId, difficulty)
    return null
  }
}

/**
 * Clear saved game state
 */
export function clearGameState(puzzleId?: string, difficulty?: string): void {
  if (!isBrowser) return
  
  try {
    const key = keyFor(puzzleId, difficulty)
    localStorage.removeItem(key)
  } catch (error) {
    console.error('Failed to clear game state:', error)
  }
}

/**
 * Save selected difficulty preference
 */
export function saveDifficultyPreference(difficulty: Difficulty): void {
  if (!isBrowser) return
  
  try {
    const key = getScopedKey('puzzroo_sudoku_difficulty')
    localStorage.setItem(key, difficulty)
  } catch (error) {
    console.error('Failed to save difficulty preference:', error)
  }
}

/**
 * Load difficulty preference
 */
export function loadDifficultyPreference(): Difficulty {
  if (!isBrowser) return 'easy'
  
  try {
    const key = getScopedKey('puzzroo_sudoku_difficulty')
    const saved = localStorage.getItem(key)
    if (saved && ['easy', 'medium', 'hard'].includes(saved)) {
      return saved as Difficulty
    }
  } catch (error) {
    console.error('Failed to load difficulty preference:', error)
  }
  return 'easy' // Default
}
