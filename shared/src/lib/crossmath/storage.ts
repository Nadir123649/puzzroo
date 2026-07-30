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

export function saveDifficultyPreference(difficulty: Difficulty): void {
  if (!isBrowser) return
  try {
    const key = getScopedKey(DIFFICULTY_KEY)
    localStorage.setItem(key, difficulty)
  } catch (error) {
    console.error('Failed to save difficulty preference:', error)
  }
}

export function loadDifficultyPreference(): Difficulty {
  if (!isBrowser) return 'easy'
  try {
    const key = getScopedKey(DIFFICULTY_KEY)
    const saved = localStorage.getItem(key)
    if (saved && ['easy', 'medium', 'hard'].includes(saved)) {
      return saved as Difficulty
    }
  } catch (error) {
    console.error('Failed to load difficulty preference:', error)
  }
  return 'easy'
}

const keyFor = (puzzleId?: string, difficulty?: string) => {
  let baseKey = STORAGE_KEY
  if (puzzleId) {
    baseKey = `puzzroo_crossmath_game_${puzzleId}`
  } else if (difficulty) {
    baseKey = `puzzroo_crossmath_game_${difficulty}`
  }
  return getScopedKey(baseKey)
}

export function saveGameState(state: Omit<SavedCrossMathState, 'version' | 'savedAt'>, puzzleId?: string, difficulty?: string): void {
  if (!isBrowser) return
  try {
    const dataToSave: SavedCrossMathState = {
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

export function loadGameState(puzzleId?: string, difficulty?: string): SavedCrossMathState | null {
  if (!isBrowser) return null
  try {
    const key = keyFor(puzzleId, difficulty)
    const data = localStorage.getItem(key)
    if (!data) return null

    const parsed = JSON.parse(data) as SavedCrossMathState

    if (parsed.version !== STORAGE_VERSION) {
      clearGameState(puzzleId, difficulty)
      return null
    }

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

export function clearGameState(puzzleId?: string, difficulty?: string): void {
  if (!isBrowser) return
  try {
    const key = keyFor(puzzleId, difficulty)
    localStorage.removeItem(key)
  } catch (error) {
    console.error('Failed to clear game state:', error)
  }
}
