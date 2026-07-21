/**
 * Daily Challenge Generator
 * Deterministic puzzle generation based on date
 */

import { DailyChallenge, DailyChallengeDifficulty, DailyChallengeShape } from './types'

const SHAPES: DailyChallengeShape[] = ['classic', 'cross', 'snake', 'diamond', 'maze', 'spiral']
const DIFFICULTIES: DailyChallengeDifficulty[] = ['easy', 'medium', 'hard']

/**
 * Seeded random number generator for deterministic results
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed++) * 10000
  return x - Math.floor(x)
}

/**
 * Convert date to seed number
 */
function dateToSeed(date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
}

/**
 * Format date as MM-DD-YY
 */
function formatDateString(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const year = String(date.getFullYear()).slice(-2)
  return `${month}-${day}-${year}`
}

/**
 * Get day name
 */
function getDayName(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[date.getDay()]
}

/**
 * Generate daily challenge for a specific date
 */
export function generateDailyChallenge(
  date: Date,
  gameId: 'sudoku' | 'cross-math' | 'nonogram' | 'tangram'
): DailyChallenge {
  const seed = dateToSeed(date)
  
  // Deterministically select shape and difficulty based on seed
  const shapeIndex = Math.floor(seededRandom(seed) * SHAPES.length)
  const difficultyIndex = Math.floor(seededRandom(seed + 1) * DIFFICULTIES.length)
  
  const shape = SHAPES[shapeIndex]
  const difficulty = DIFFICULTIES[difficultyIndex]
  
  return {
    id: `daily-${gameId}-${formatDateString(date)}`,
    date,
    dateString: formatDateString(date),
    dayName: getDayName(date),
    difficulty,
    shape,
    status: 'not-started',
    gameId,
    puzzleData: {
      // This will be populated with actual puzzle data
      shape,
      difficulty,
      seed,
    },
  }
}

/**
 * Generate past puzzles.
 *
 * The window is anchored to the account's creation date (defaulting to "today"
 * for guests/anonymous), starting TWO days before it, and always includes at
 * least 3 puzzles. This keeps brand-new accounts from showing an empty list
 * while never exposing puzzles dated before the user existed.
 */
export function generatePastPuzzles(
  days: number,
  gameId: 'sudoku' | 'cross-math' | 'nonogram' | 'tangram',
  accountCreatedAt?: Date
): DailyChallenge[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Start two days before the account was created (or two days ago for guests).
  const start = new Date(accountCreatedAt ?? today)
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - 2)

  const puzzles: DailyChallenge[] = []
  const cursor = new Date(start)
  while (cursor <= today) {
    puzzles.push(generateDailyChallenge(new Date(cursor), gameId))
    cursor.setDate(cursor.getDate() + 1)
  }

  // Guarantee a minimum of 3 puzzles (brand-new accounts).
  while (puzzles.length < 3) {
    start.setDate(start.getDate() - 1)
    puzzles.unshift(generateDailyChallenge(new Date(start), gameId))
  }

  // Cap to the requested window size if it would otherwise be larger.
  return puzzles.length > days ? puzzles.slice(puzzles.length - days) : puzzles
}

/**
 * Get today's daily challenge
 */
export function getTodayChallenge(gameId: 'sudoku' | 'cross-math' | 'nonogram' | 'tangram'): DailyChallenge {
  return generateDailyChallenge(new Date(), gameId)
}
