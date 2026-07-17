/**
 * Nonogram Puzzle Auditor & Repair Utility
 * 
 * This utility provides:
 * 1. Correct clue generation from solution grids
 * 2. Puzzle validation
 * 3. Dataset integrity auditing
 * 4. Automatic repair functions
 */

import type { PuzzleData, Clue } from './types'

// ============================================
// CORE CLUE GENERATION (Single Source of Truth)
// ============================================

/**
 * Generate clues from a solution line (row or column)
 * CRITICAL: Returns empty array [] for lines with no filled cells
 * NEVER returns [0]
 */
export function generateCluesFromLine(line: number[]): number[] {
  const clues: number[] = []
  let consecutiveCount = 0
  
  for (const cell of line) {
    if (cell === 1) {
      consecutiveCount++
    } else if (consecutiveCount > 0) {
      clues.push(consecutiveCount)
      consecutiveCount = 0
    }
  }
  
  // Push final group if exists
  if (consecutiveCount > 0) {
    clues.push(consecutiveCount)
  }
  
  // Return empty array if no filled cells (NOT [0])
  return clues
}

/**
 * Generate row clues from solution matrix
 */
export function generateRowClues(solution: number[][]): Clue[] {
  return solution.map(row => ({
    values: generateCluesFromLine(row)
  }))
}

/**
 * Generate column clues from solution matrix
 */
export function generateColumnClues(solution: number[][]): Clue[] {
  const size = solution.length
  const columnClues: Clue[] = []
  
  for (let col = 0; col < size; col++) {
    const column = solution.map(row => row[col])
    columnClues.push({
      values: generateCluesFromLine(column)
    })
  }
  
  return columnClues
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

export interface ValidationError {
  puzzleId: string
  errorType: 'size_mismatch' | 'incorrect_row_clue' | 'incorrect_column_clue' | 'invalid_zero_clue' | 'dimension_mismatch'
  message: string
  rowIndex?: number
  colIndex?: number
  expected?: number[]
  actual?: number[]
}

/**
 * Validate a single puzzle against its solution
 */
export function validatePuzzle(puzzle: PuzzleData): ValidationError[] {
  const errors: ValidationError[] = []
  const { id, size, solution, rowClues, columnClues } = puzzle
  
  // 1. Validate solution dimensions
  if (solution.length !== size) {
    errors.push({
      puzzleId: id,
      errorType: 'dimension_mismatch',
      message: `Solution has ${solution.length} rows but puzzle size is ${size}`
    })
  }
  
  for (let i = 0; i < solution.length; i++) {
    if (solution[i].length !== size) {
      errors.push({
        puzzleId: id,
        errorType: 'dimension_mismatch',
        message: `Row ${i} has ${solution[i].length} cells but puzzle size is ${size}`
      })
    }
  }
  
  // 2. Validate row clues count
  if (rowClues.length !== size) {
    errors.push({
      puzzleId: id,
      errorType: 'size_mismatch',
      message: `Expected ${size} row clues but got ${rowClues.length}`
    })
  }
  
  // 3. Validate column clues count
  if (columnClues.length !== size) {
    errors.push({
      puzzleId: id,
      errorType: 'size_mismatch',
      message: `Expected ${size} column clues but got ${columnClues.length}`
    })
  }
  
  // 4. Validate each row clue
  const correctRowClues = generateRowClues(solution)
  for (let row = 0; row < Math.min(solution.length, rowClues.length); row++) {
    const expected = correctRowClues[row].values
    const actual = rowClues[row].values
    
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      errors.push({
        puzzleId: id,
        errorType: 'incorrect_row_clue',
        message: `Row ${row} clue mismatch`,
        rowIndex: row,
        expected,
        actual
      })
    }
    
    // Check for invalid [0] clues
    if (actual.length === 1 && actual[0] === 0 && expected.length !== 0) {
      errors.push({
        puzzleId: id,
        errorType: 'invalid_zero_clue',
        message: `Row ${row} has invalid [0] clue, should be ${JSON.stringify(expected)}`,
        rowIndex: row,
        expected,
        actual
      })
    }
  }
  
  // 5. Validate each column clue
  const correctColumnClues = generateColumnClues(solution)
  for (let col = 0; col < Math.min(size, columnClues.length); col++) {
    const expected = correctColumnClues[col].values
    const actual = columnClues[col].values
    
    if (JSON.stringify(expected) !== JSON.stringify(actual)) {
      errors.push({
        puzzleId: id,
        errorType: 'incorrect_column_clue',
        message: `Column ${col} clue mismatch`,
        colIndex: col,
        expected,
        actual
      })
    }
    
    // Check for invalid [0] clues
    if (actual.length === 1 && actual[0] === 0 && expected.length !== 0) {
      errors.push({
        puzzleId: id,
        errorType: 'invalid_zero_clue',
        message: `Column ${col} has invalid [0] clue, should be ${JSON.stringify(expected)}`,
        colIndex: col,
        expected,
        actual
      })
    }
  }
  
  return errors
}

/**
 * Validate an array of puzzles
 */
export function validatePuzzleCollection(puzzles: PuzzleData[]): Map<string, ValidationError[]> {
  const results = new Map<string, ValidationError[]>()
  
  for (const puzzle of puzzles) {
    const errors = validatePuzzle(puzzle)
    if (errors.length > 0) {
      results.set(puzzle.id, errors)
    }
  }
  
  return results
}

// ============================================
// REPAIR FUNCTIONS
// ============================================

/**
 * Repair a single puzzle by recalculating clues from solution
 */
export function repairPuzzle(puzzle: PuzzleData): PuzzleData {
  return {
    ...puzzle,
    rowClues: generateRowClues(puzzle.solution),
    columnClues: generateColumnClues(puzzle.solution)
  }
}

/**
 * Repair an array of puzzles
 */
export function repairPuzzleCollection(puzzles: PuzzleData[]): PuzzleData[] {
  return puzzles.map(repairPuzzle)
}

// ============================================
// AUDIT REPORTING
// ============================================

export interface AuditReport {
  totalPuzzles: number
  validPuzzles: number
  invalidPuzzles: number
  errors: Map<string, ValidationError[]>
  summary: string
}

/**
 * Generate a comprehensive audit report
 */
export function auditPuzzles(puzzles: PuzzleData[]): AuditReport {
  const errors = validatePuzzleCollection(puzzles)
  const invalidPuzzles = errors.size
  const validPuzzles = puzzles.length - invalidPuzzles
  
  let summary = `\n${'='.repeat(60)}\n`
  summary += `NONOGRAM PUZZLE AUDIT REPORT\n`
  summary += `${'='.repeat(60)}\n\n`
  summary += `Total Puzzles: ${puzzles.length}\n`
  summary += `Valid Puzzles: ${validPuzzles}\n`
  summary += `Invalid Puzzles: ${invalidPuzzles}\n\n`
  
  if (invalidPuzzles > 0) {
    summary += `${'='.repeat(60)}\n`
    summary += `ERRORS FOUND:\n`
    summary += `${'='.repeat(60)}\n\n`
    
    errors.forEach((puzzleErrors, puzzleId) => {
      const puzzle = puzzles.find(p => p.id === puzzleId)
      summary += `\n📋 PUZZLE: ${puzzleId} (${puzzle?.title})\n`
      summary += `   Difficulty: ${puzzle?.difficulty}\n`
      summary += `   Size: ${puzzle?.size}x${puzzle?.size}\n`
      summary += `   Errors: ${puzzleErrors.length}\n\n`
      
      puzzleErrors.forEach((error, index) => {
        summary += `   ${index + 1}. ${error.errorType.toUpperCase()}\n`
        summary += `      ${error.message}\n`
        if (error.expected !== undefined && error.actual !== undefined) {
          summary += `      Expected: [${error.expected.join(', ')}]\n`
          summary += `      Actual:   [${error.actual.join(', ')}]\n`
        }
        summary += `\n`
      })
    })
  } else {
    summary += `✅ All puzzles are valid!\n`
  }
  
  summary += `${'='.repeat(60)}\n`
  
  return {
    totalPuzzles: puzzles.length,
    validPuzzles,
    invalidPuzzles,
    errors,
    summary
  }
}

/**
 * Print audit report to console
 */
export function printAuditReport(report: AuditReport): void {
  console.log(report.summary)
}
