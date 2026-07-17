/**
 * Sudoku Helper Functions
 * Utility functions for board operations
 */

import { SudokuBoard, SudokuCell, Position } from './types'
import { BOARD_SIZE, EMPTY_CELL } from './constants'

/**
 * Creates an empty Sudoku board
 */
export function createEmptyBoard(): SudokuBoard {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => ({
      value: EMPTY_CELL,
      fixed: false,
    }))
  )
}

/**
 * Checks if a position is valid on the board
 */
export function isValidPosition(pos: Position): boolean {
  return pos.row >= 0 && pos.row < BOARD_SIZE && pos.col >= 0 && pos.col < BOARD_SIZE
}

/**
 * Gets the cell at a specific position
 */
export function getCellAt(board: SudokuBoard, pos: Position): SudokuCell | null {
  if (!isValidPosition(pos)) return null
  return board[pos.row][pos.col]
}

/**
 * Creates a deep copy of the board
 */
export function cloneBoard(board: SudokuBoard): SudokuBoard {
  return board.map((row) =>
    row.map((cell) => ({
      ...cell,
      notes: cell.notes ? [...cell.notes] : undefined,
    }))
  )
}

/**
 * Checks if the board is completely filled
 */
export function isBoardComplete(board: SudokuBoard): boolean {
  return board.every((row) => row.every((cell) => cell.value !== null))
}

/**
 * Validates if the current board matches the solution
 */
export function validateBoardAgainstSolution(
  currentBoard: SudokuBoard,
  solution: SudokuBoard
): boolean {
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      const currentValue = currentBoard[row][col].value
      const correctValue = solution[row][col].value
      
      if (currentValue !== correctValue) {
        return false
      }
    }
  }
  return true
}

/**
 * Gets the correct value for a cell from the solution
 */
export function getCorrectValue(
  solution: SudokuBoard,
  pos: Position
): number | null {
  if (!isValidPosition(pos)) return null
  return solution[pos.row][pos.col].value
}

/**
 * Validates if the entire board is a valid completed Sudoku
 */
export function isValidCompletedBoard(board: SudokuBoard): boolean {
  // Check if board is complete
  if (!isBoardComplete(board)) {
    return false
  }

  // Check all rows
  for (let row = 0; row < BOARD_SIZE; row++) {
    const rowValues = new Set<number>()
    for (let col = 0; col < BOARD_SIZE; col++) {
      const value = board[row][col].value
      if (!value || value < 1 || value > 9 || rowValues.has(value)) {
        return false // Invalid or duplicate
      }
      rowValues.add(value)
    }
  }

  // Check all columns
  for (let col = 0; col < BOARD_SIZE; col++) {
    const colValues = new Set<number>()
    for (let row = 0; row < BOARD_SIZE; row++) {
      const value = board[row][col].value
      if (!value || colValues.has(value)) {
        return false // Duplicate
      }
      colValues.add(value)
    }
  }

  // Check all 3x3 boxes
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const boxValues = new Set<number>()
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const value = board[boxRow * 3 + row][boxCol * 3 + col].value
          if (!value || boxValues.has(value)) {
            return false // Duplicate
          }
          boxValues.add(value)
        }
      }
    }
  }

  return true // Valid completed Sudoku
}

/**
 * Check if a number is valid at a position (Sudoku rules)
 */
export function isValidMove(
  board: SudokuBoard,
  pos: Position,
  num: number
): boolean {
  // Check row
  for (let col = 0; col < BOARD_SIZE; col++) {
    if (col !== pos.col && board[pos.row][col].value === num) {
      return false // Duplicate in row
    }
  }

  // Check column
  for (let row = 0; row < BOARD_SIZE; row++) {
    if (row !== pos.row && board[row][pos.col].value === num) {
      return false // Duplicate in column
    }
  }

  // Check 3x3 box
  const boxStartRow = Math.floor(pos.row / 3) * 3
  const boxStartCol = Math.floor(pos.col / 3) * 3
  
  for (let row = boxStartRow; row < boxStartRow + 3; row++) {
    for (let col = boxStartCol; col < boxStartCol + 3; col++) {
      if ((row !== pos.row || col !== pos.col) && board[row][col].value === num) {
        return false // Duplicate in box
      }
    }
  }

  return true // Valid move
}

/**
 * Formats time in seconds to MM:SS format
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}


/**
 * Updates a cell value at a specific position
 */
export function updateCellValue(
  board: SudokuBoard,
  pos: Position,
  value: number | null
): SudokuBoard {
  const newBoard = cloneBoard(board)
  if (isValidPosition(pos)) {
    newBoard[pos.row][pos.col].value = value
  }
  return newBoard
}

/**
 * Clears a cell at a specific position
 */
export function clearCell(board: SudokuBoard, pos: Position): SudokuBoard {
  return updateCellValue(board, pos, EMPTY_CELL)
}

/**
 * Moves selection in the specified direction
 */
export function moveSelection(current: Position, direction: 'up' | 'down' | 'left' | 'right'): Position {
  const deltas = {
    up: { row: -1, col: 0 },
    down: { row: 1, col: 0 },
    left: { row: 0, col: -1 },
    right: { row: 0, col: 1 },
  }

  const delta = deltas[direction]
  const newPos = {
    row: current.row + delta.row,
    col: current.col + delta.col,
  }

  return isValidPosition(newPos) ? newPos : current
}

/**
 * Toggle a note in a cell
 */
export function toggleNote(cell: SudokuCell, number: number): SudokuCell {
  const currentNotes = cell.notes || []
  const hasNote = currentNotes.includes(number)
  
  return {
    ...cell,
    notes: hasNote
      ? currentNotes.filter((n) => n !== number)
      : [...currentNotes, number].sort(),
  }
}

/**
 * Clear all notes from a cell
 */
export function clearNotes(cell: SudokuCell): SudokuCell {
  return {
    ...cell,
    notes: [],
  }
}

/**
 * Update cell with toggle note
 */
export function updateCellNote(
  board: SudokuBoard,
  pos: Position,
  number: number
): SudokuBoard {
  const newBoard = cloneBoard(board)
  if (isValidPosition(pos)) {
    const cell = newBoard[pos.row][pos.col]
    newBoard[pos.row][pos.col] = toggleNote(cell, number)
  }
  return newBoard
}

/**
 * Find a random empty cell for hint
 */
export function findEmptyCell(board: SudokuBoard): Position | null {
  const emptyCells: Position[] = []
  
  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (!board[row][col].value && !board[row][col].fixed) {
        emptyCells.push({ row, col })
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
 * Formula: Math.floor(score / 20)
 */
export function calculateAvailableHints(score: number): number {
  return Math.floor(score / 20)
}

/**
 * Convert puzzle data array to SudokuBoard
 */
export function convertToSudokuBoard(puzzleArray: number[][]): SudokuBoard {
  return puzzleArray.map((row) =>
    row.map((value) => ({
      value: value === 0 ? null : value,
      fixed: value !== 0,
      notes: [],
    }))
  )
}
