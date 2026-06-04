/**
 * Sudoku Puzzle Dataset Index
 * Centralized export for all puzzle data
 */

import { easyPuzzles } from './easy'
import { mediumPuzzles } from './medium'
import { hardPuzzles } from './hard'
import type { Difficulty, SudokuPuzzleData, PuzzleDataset } from './types'

export const puzzleDataset: PuzzleDataset = {
  easy: easyPuzzles,
  medium: mediumPuzzles,
  hard: hardPuzzles,
}

/**
 * Get random puzzle from specified difficulty
 * Avoids immediate repeats using lastPuzzleId
 */
export function getRandomPuzzle(
  difficulty: Difficulty,
  lastPuzzleId?: string
): SudokuPuzzleData {
  const puzzles = puzzleDataset[difficulty]
  
  if (puzzles.length === 0) {
    throw new Error(`No puzzles available for difficulty: ${difficulty}`)
  }

  // If only one puzzle, return it
  if (puzzles.length === 1) {
    return puzzles[0]
  }

  // Filter out last puzzle if possible
  const availablePuzzles = lastPuzzleId
    ? puzzles.filter((p) => p.id !== lastPuzzleId)
    : puzzles

  // If filtering removed all puzzles, use full list
  const selectFrom = availablePuzzles.length > 0 ? availablePuzzles : puzzles

  // Random selection
  const randomIndex = Math.floor(Math.random() * selectFrom.length)
  return selectFrom[randomIndex]
}

/**
 * Get puzzle by ID
 */
export function getPuzzleById(id: string): SudokuPuzzleData | null {
  const allPuzzles = [
    ...puzzleDataset.easy,
    ...puzzleDataset.medium,
    ...puzzleDataset.hard,
  ]
  
  return allPuzzles.find((p) => p.id === id) || null
}

export type { Difficulty, SudokuPuzzleData, PuzzleDataset }
