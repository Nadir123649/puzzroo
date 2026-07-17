import { Difficulty } from './types'

const DIFFICULTY_KEY = 'crossmath_difficulty_preference'
const STORAGE_KEY = 'puzzroo_crossmath_game'
const STORAGE_VERSION = '1.3'

const isBrowser = typeof window !== 'undefined'

export interface SavedCrossMathState {
  version: string
  board: any[][]
  puzzleId: string
  difficulty: Difficulty
  mistakes: number
  score: number
  time: number
  gameStatus: string
  savedAt: number
}

export function saveDifficultyPreference(difficulty: Difficulty): void {
  if (!isBrowser) return
  try {
    localStorage.setItem(DIFFICULTY_KEY, difficulty)
  } catch (error) {
    console.error('Failed to save difficulty preference:', error)
  }
}

export function loadDifficultyPreference(): Difficulty {
  if (!isBrowser) return 'easy'
  try {
    const saved = localStorage.getItem(DIFFICULTY_KEY)
    if (saved && ['easy', 'medium', 'hard'].includes(saved)) {
      return saved as Difficulty
    }
  } catch (error) {
    console.error('Failed to load difficulty preference:', error)
  }
  return 'easy'
}

export function saveGameState(state: Omit<SavedCrossMathState, 'version' | 'savedAt'>): void {
  if (!isBrowser) return
  try {
    const dataToSave: SavedCrossMathState = {
      ...state,
      version: STORAGE_VERSION,
      savedAt: Date.now(),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave))
  } catch (error) {
    console.error('Failed to save game state:', error)
  }
}

export function loadGameState(): SavedCrossMathState | null {
  if (!isBrowser) return null
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return null

    const parsed = JSON.parse(data) as SavedCrossMathState

    if (parsed.version !== STORAGE_VERSION) {
      clearGameState()
      return null
    }

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

export function clearGameState(): void {
  if (!isBrowser) return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear game state:', error)
  }
}
