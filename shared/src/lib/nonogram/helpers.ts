// Nonogram Helper Functions
// Phase 1: Basic grid initialization and utilities
// Phase 2: Validation, completion detection, and progress tracking

import type { CellState, GridSize, Clue, CellPosition, ValidationStatus, GameProgress } from './types'

/**
 * Initialize an empty grid with all cells set to 'empty'
 */
export function createEmptyGrid(size: GridSize): CellState[][] {
  return Array(size)
    .fill(null)
    .map(() => Array(size).fill('empty'))
}

/**
 * Calculate clues from a solution matrix
 * Returns array of consecutive filled cell counts per row/column
 * CRITICAL: Returns empty array [] for lines with no filled cells (NEVER [0])
 */
export function calculateClues(line: number[]): Clue {
  const values: number[] = []
  let count = 0
  
  for (const cell of line) {
    if (cell === 1) {
      count++
    } else if (count > 0) {
      values.push(count)
      count = 0
    }
  }
  
  if (count > 0) {
    values.push(count)
  }
  
  // Return empty array for lines with no filled cells
  return { values }
}

/**
 * Calculate clues from a grid state (for validation)
 */
export function calculateCluesFromGrid(line: CellState[]): Clue {
  const binaryLine = line.map(cell => cell === 'filled' ? 1 : 0)
  return calculateClues(binaryLine)
}

/**
 * Generate row clues from solution matrix
 */
export function generateRowClues(solution: number[][]): Clue[] {
  return solution.map(row => calculateClues(row))
}

/**
 * Generate column clues from solution matrix
 */
export function generateColumnClues(solution: number[][]): Clue[] {
  const size = solution.length
  const columnClues: Clue[] = []
  
  for (let col = 0; col < size; col++) {
    const column = solution.map(row => row[col])
    columnClues.push(calculateClues(column))
  }
  
  return columnClues
}

/**
 * Check if a position should have a thick border (5x5 grouping)
 */
export function shouldHaveThickBorder(index: number, groupSize: number = 5): boolean {
  return index % groupSize === 0
}

// ============================================
// Phase 2: Validation & Completion Logic
// ============================================

/**
 * Check if puzzle is complete (all cells match solution)
 * Enhanced with zero-clue validation
 */
export function checkPuzzleCompletion(grid: CellState[][], solution: number[][]): boolean {
  if (grid.length !== solution.length) return false
  
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const shouldBeFilled = solution[row][col] === 1
      const isFilled = grid[row][col] === 'filled'
      
      // Cell must match solution requirement
      if (shouldBeFilled !== isFilled) {
        return false
      }
    }
  }
  
  return true
}

/**
 * Validate that zero-clue rows have no filled cells
 * UPDATED: Empty array [] indicates no filled cells (not [0])
 */
export function validateZeroClueRow(grid: CellState[][], rowIndex: number, clue: Clue): boolean {
  // If clue is empty array, row must be completely empty
  if (clue.values.length === 0) {
    return grid[rowIndex].every(cell => cell !== 'filled')
  }
  return true
}

/**
 * Validate that zero-clue columns have no filled cells
 * UPDATED: Empty array [] indicates no filled cells (not [0])
 */
export function validateZeroClueColumn(grid: CellState[][], colIndex: number, clue: Clue): boolean {
  // If clue is empty array, column must be completely empty
  if (clue.values.length === 0) {
    const column = grid.map(row => row[colIndex])
    return column.every(cell => cell !== 'filled')
  }
  return true
}

/**
 * Validate that solution data respects zero-clue constraints
 * UPDATED: Empty array [] indicates no filled cells (not [0])
 */
export function validatePuzzleData(solution: number[][], rowClues: Clue[], columnClues: Clue[]): boolean {
  // Check rows with zero clues
  for (let row = 0; row < solution.length; row++) {
    const clue = rowClues[row]
    if (clue.values.length === 0) {
      // Row must have no filled cells
      if (solution[row].some(cell => cell === 1)) {
        console.error(`Invalid puzzle: Row ${row} has empty clue [] but contains filled cells`)
        return false
      }
    }
  }
  
  // Check columns with zero clues
  for (let col = 0; col < solution.length; col++) {
    const clue = columnClues[col]
    if (clue.values.length === 0) {
      // Column must have no filled cells
      const column = solution.map(row => row[col])
      if (column.some(cell => cell === 1)) {
        console.error(`Invalid puzzle: Column ${col} has empty clue [] but contains filled cells`)
        return false
      }
    }
  }
  
  return true
}

/**
 * Validate a single row against its clue
 */
export function validateRow(grid: CellState[][], rowIndex: number, expectedClue: Clue): ValidationStatus {
  const row = grid[rowIndex]
  const actualClue = calculateCluesFromGrid(row)
  
  // Compare clue values
  if (JSON.stringify(actualClue.values) === JSON.stringify(expectedClue.values)) {
    return 'completed'
  }
  
  // Check if potentially invalid (over-filled)
  if (actualClue.values.length > expectedClue.values.length) {
    return 'invalid'
  }
  
  return 'incomplete'
}

/**
 * Validate a single column against its clue
 */
export function validateColumn(grid: CellState[][], colIndex: number, expectedClue: Clue): ValidationStatus {
  const column = grid.map(row => row[colIndex])
  const actualClue = calculateCluesFromGrid(column)
  
  // Compare clue values
  if (JSON.stringify(actualClue.values) === JSON.stringify(expectedClue.values)) {
    return 'completed'
  }
  
  // Check if potentially invalid (over-filled)
  if (actualClue.values.length > expectedClue.values.length) {
    return 'invalid'
  }
  
  return 'incomplete'
}

/**
 * Validate all rows
 */
export function validateAllRows(grid: CellState[][], rowClues: Clue[]): ValidationStatus[] {
  return rowClues.map((clue, index) => validateRow(grid, index, clue))
}

/**
 * Validate all columns
 */
export function validateAllColumns(grid: CellState[][], columnClues: Clue[]): ValidationStatus[] {
  return columnClues.map((clue, index) => validateColumn(grid, index, clue))
}

/**
 * Calculate game progress
 */
export function calculateProgress(grid: CellState[][], solution: number[][]): GameProgress {
  let totalCellsRequired = 0
  let correctCellsFilled = 0
  
  for (let row = 0; row < solution.length; row++) {
    for (let col = 0; col < solution[row].length; col++) {
      if (solution[row][col] === 1) {
        totalCellsRequired++
        if (grid[row][col] === 'filled') {
          correctCellsFilled++
        }
      }
    }
  }
  
  const percentComplete = totalCellsRequired > 0 
    ? Math.round((correctCellsFilled / totalCellsRequired) * 100)
    : 0
  
  return {
    totalCellsRequired,
    correctCellsFilled,
    percentComplete
  }
}

/**
 * Check if a specific cell is a mistake
 */
export function isCellMistake(grid: CellState[][], solution: number[][], position: CellPosition): boolean {
  const { row, col } = position
  const shouldBeFilled = solution[row][col] === 1
  const isFilled = grid[row][col] === 'filled'
  const isMarked = grid[row][col] === 'marked'
  
  // Mistake if filled when should be empty, or marked when should be filled
  return (shouldBeFilled && isMarked) || (!shouldBeFilled && isFilled)
}

/**
 * Find hint position (first empty cell that should be filled)
 */
export function findHintPosition(grid: CellState[][], solution: number[][]): CellPosition | null {
  for (let row = 0; row < solution.length; row++) {
    for (let col = 0; col < solution[row].length; col++) {
      if (solution[row][col] === 1 && grid[row][col] !== 'filled') {
        return { row, col }
      }
    }
  }
  return null
}

/**
 * Format time for display (HH:MM:SS)
 */
export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
