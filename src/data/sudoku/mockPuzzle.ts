/**
 * Mock Sudoku Puzzle
 * Initial puzzle data matching the current UI
 */

import { SudokuBoard } from '@/lib/sudoku/types'
import { sudokuPuzzle } from './puzzle'

/**
 * Converts raw puzzle data to SudokuBoard format
 */
export function getMockPuzzle(): SudokuBoard {
  return sudokuPuzzle.puzzle.map((row) =>
    row.map((value) => ({
      value: value === 0 ? null : value,
      fixed: value !== 0, // Pre-filled numbers are fixed
    }))
  )
}

/**
 * Converts solution data to SudokuBoard format
 */
export function getSolution(): SudokuBoard {
  return sudokuPuzzle.solution.map((row) =>
    row.map((value) => ({
      value: value,
      fixed: false, // Solution doesn't need fixed flag
    }))
  )
}

export default getMockPuzzle
