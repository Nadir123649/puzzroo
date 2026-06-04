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

/**
 * Save game state to localStorage
 */
export function saveGameState(state: Omit<SavedGameState, 'version' | 'savedAt'>): void {
  if (!isBrowser) return
  
  try {
    const dataToSave: SavedGameState = {
      ...state,
      version: STORAGE_VERSION,
      savedAt: Date.now(),
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
  } catch (error) {
    console.error('Failed to save game state:', error)
  }
}

/**
 * Load game state from localStorage
 */
export function loadGameState(): SavedGameState | null {
  if (!isBrowser) return null
  
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return null

    const parsed = JSON.parse(data) as SavedGameState

    // Version check
    if (parsed.version !== STORAGE_VERSION) {
      console.warn('Saved game version mismatch, clearing storage')
      clearGameState()
      return null
    }

    // Don't restore completed games
    if (parsed.gameStatus === 'won' || parsed.gameStatus === 'lost') {
      clearGameState()
      return null
    }

    return parsed
  } catch (error) {
    console.error('Failed to load game state:', error)
    clearGameState()
    return null
  }
}

/**
 * Clear saved game state
 */
export function clearGameState(): void {
  if (!isBrowser) return
  
  try {
    localStorage.removeItem(STORAGE_KEY)
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
    localStorage.setItem('puzzroo_sudoku_difficulty', difficulty)
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
    const saved = localStorage.getItem('puzzroo_sudoku_difficulty')
    if (saved && ['easy', 'medium', 'hard'].includes(saved)) {
      return saved as Difficulty
    }
  } catch (error) {
    console.error('Failed to load difficulty preference:', error)
  }
  return 'easy' // Default
}
