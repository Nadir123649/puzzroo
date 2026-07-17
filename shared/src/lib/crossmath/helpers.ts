/**
 * CrossMath Helper Functions
 */

import { Cell } from './types'
import { SCORING } from './constants'

/**
 * Check if board is complete (all editable cells filled)
 */
export function isBoardComplete(board: Cell[][]): boolean {
  for (const row of board) {
    for (const cell of row) {
      if (cell.isEditable && cell.type === 'empty') {
        return false
      }
    }
  }
  return true
}

/**
 * Get correct value for a cell from solution
 */
export function getCorrectValue(
  solution: Record<string, number>,
  row: number,
  col: number
): number | null {
  const key = `${row}-${col}`
  return solution[key] ?? null
}

/**
 * Validate board against solution
 */
export function validateBoard(
  board: Cell[][],
  solution: Record<string, number>
): boolean {
  for (const row of board) {
    for (const cell of row) {
      if (cell.isEditable && cell.type === 'number') {
        const correctValue = getCorrectValue(solution, cell.row, cell.col)
        if (correctValue !== null && cell.value !== correctValue) {
          return false
        }
      }
    }
  }
  return true
}

/**
 * Find an empty editable cell for hint
 */
export function findEmptyCell(board: Cell[][]): { row: number; col: number } | null {
  const emptyCells: { row: number; col: number }[] = []
  
  for (const row of board) {
    for (const cell of row) {
      if (cell.isEditable && cell.type === 'empty') {
        emptyCells.push({ row: cell.row, col: cell.col })
      }
    }
  }
  
  if (emptyCells.length === 0) return null
  
  // Return random empty cell
  const randomIndex = Math.floor(Math.random() * emptyCells.length)
  return emptyCells[randomIndex]
}

/**
 * Calculate available hints based on score
 */
export function calculateAvailableHints(score: number): number {
  return Math.floor(score / SCORING.HINT_SCORE_REQUIRED)
}

/**
 * Clone board (deep copy)
 */
export function cloneBoard(board: Cell[][]): Cell[][] {
  return board.map(row => row.map(cell => ({ ...cell })))
}
