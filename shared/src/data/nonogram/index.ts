import { PuzzleData, Difficulty } from '@shared/lib/nonogram/types'
import { easyPuzzles } from './easy'
import { mediumPuzzles } from './medium'
import { hardPuzzles } from './hard'
import { dailyPuzzles } from './daily'
// import { validatePuzzleDataset } from '@shared/lib/nonogram/puzzleValidator'

// TODO: Re-enable validation after fixing puzzle data
// Validate all puzzles during build
// if (typeof window === 'undefined') {
//   try {
//     validatePuzzleDataset(easyPuzzles, 'Easy Puzzles')
//     validatePuzzleDataset(mediumPuzzles, 'Medium Puzzles')
//     validatePuzzleDataset(hardPuzzles, 'Hard Puzzles')
//     validatePuzzleDataset(dailyPuzzles, 'Daily Puzzles')
//   } catch (error) {
//     console.error('❌ Nonogram puzzle validation failed!')
//     throw error
//   }
// }

// Puzzle Registry - Central source of truth
export const puzzleRegistry: Record<Difficulty, PuzzleData[]> = {
  easy: easyPuzzles,
  medium: mediumPuzzles,
  hard: hardPuzzles,
}

// All puzzles flattened
export const allPuzzles: PuzzleData[] = [
  ...easyPuzzles,
  ...mediumPuzzles,
  ...hardPuzzles,
]

// Daily puzzles
export { dailyPuzzles }

// Get puzzle by ID
export function getPuzzleById(id: string): PuzzleData | undefined {
  return allPuzzles.find((p) => p.id === id) || dailyPuzzles.find((p) => p.id === id)
}

// Get puzzles by difficulty
export function getPuzzlesByDifficulty(difficulty: Difficulty): PuzzleData[] {
  return puzzleRegistry[difficulty] || []
}

// Get random puzzle by difficulty (for backward compatibility)
export function getRandomPuzzle(difficulty: Difficulty): PuzzleData {
  const puzzles = getPuzzlesByDifficulty(difficulty)
  const randomIndex = Math.floor(Math.random() * puzzles.length)
  return puzzles[randomIndex]
}

// Get daily puzzle (rotates every day)
export function getTodaysDailyPuzzle(): PuzzleData {
  const today = new Date()
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000)
  const puzzleIndex = dayOfYear % dailyPuzzles.length
  return dailyPuzzles[puzzleIndex]
}

// Get puzzles by category
export function getPuzzlesByCategory(category: string): PuzzleData[] {
  return allPuzzles.filter((p) => p.category === category)
}

// Get all categories
export function getAllCategories(): string[] {
  const categories = new Set(allPuzzles.map((p) => p.category))
  return Array.from(categories).sort()
}

// Export puzzle counts
export const puzzleCounts = {
  easy: easyPuzzles.length,
  medium: mediumPuzzles.length,
  hard: hardPuzzles.length,
  total: allPuzzles.length,
  daily: dailyPuzzles.length,
}
