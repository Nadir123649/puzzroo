/**
 * Comprehensive Sudoku Validation Test
 * Verifies puzzle-solution integrity across all datasets
 */

import { easyPuzzles } from '@shared/data/sudoku/easy'
import { mediumPuzzles } from '@shared/data/sudoku/medium'
import { hardPuzzles } from '@shared/data/sudoku/hard'
import type { SudokuPuzzleData } from '@shared/data/sudoku/types'

interface ValidationResult {
  puzzleId: string
  difficulty: string
  valid: boolean
  errors: string[]
  warnings: string[]
  clueCount: number
}

/**
 * Check if a value is valid in a specific row
 */
function isValidInRow(solution: number[][], row: number, value: number): boolean {
  for (let col = 0; col < 9; col++) {
    if (solution[row][col] === value) {
      return false // Duplicate found
    }
  }
  return true
}

/**
 * Check if a value is valid in a specific column
 */
function isValidInColumn(solution: number[][], col: number, value: number): boolean {
  for (let row = 0; row < 9; row++) {
    if (solution[row][col] === value) {
      return false // Duplicate found
    }
  }
  return true
}

/**
 * Check if a value is valid in a specific 3x3 box
 */
function isValidInBox(solution: number[][], row: number, col: number, value: number): boolean {
  const boxStartRow = Math.floor(row / 3) * 3
  const boxStartCol = Math.floor(col / 3) * 3
  
  for (let r = boxStartRow; r < boxStartRow + 3; r++) {
    for (let c = boxStartCol; c < boxStartCol + 3; c++) {
      if (solution[r][c] === value) {
        return false // Duplicate found
      }
    }
  }
  return true
}

/**
 * Verify solution is a valid completed Sudoku
 */
function verifySolutionIsValid(solution: number[][]): string[] {
  const errors: string[] = []
  
  // Check each row
  for (let row = 0; row < 9; row++) {
    const rowSet = new Set(solution[row])
    if (rowSet.size !== 9) {
      errors.push(`Row ${row} has duplicate values`)
    }
    if (rowSet.has(0)) {
      errors.push(`Row ${row} contains empty cells (0)`)
    }
    for (let val = 1; val <= 9; val++) {
      if (!rowSet.has(val)) {
        errors.push(`Row ${row} missing value ${val}`)
      }
    }
  }
  
  // Check each column
  for (let col = 0; col < 9; col++) {
    const colSet = new Set<number>()
    for (let row = 0; row < 9; row++) {
      colSet.add(solution[row][col])
    }
    if (colSet.size !== 9) {
      errors.push(`Column ${col} has duplicate values`)
    }
    if (colSet.has(0)) {
      errors.push(`Column ${col} contains empty cells (0)`)
    }
    for (let val = 1; val <= 9; val++) {
      if (!colSet.has(val)) {
        errors.push(`Column ${col} missing value ${val}`)
      }
    }
  }
  
  // Check each 3x3 box
  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const boxSet = new Set<number>()
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          const row = boxRow * 3 + r
          const col = boxCol * 3 + c
          boxSet.add(solution[row][col])
        }
      }
      if (boxSet.size !== 9) {
        errors.push(`Box [${boxRow},${boxCol}] has duplicate values`)
      }
      if (boxSet.has(0)) {
        errors.push(`Box [${boxRow},${boxCol}] contains empty cells (0)`)
      }
      for (let val = 1; val <= 9; val++) {
        if (!boxSet.has(val)) {
          errors.push(`Box [${boxRow},${boxCol}] missing value ${val}`)
        }
      }
    }
  }
  
  return errors
}

/**
 * Verify puzzle clues match solution
 */
function verifyPuzzleMatchesSolution(puzzle: number[][], solution: number[][]): string[] {
  const errors: string[] = []
  
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const puzzleValue = puzzle[row][col]
      const solutionValue = solution[row][col]
      
      if (puzzleValue !== 0 && puzzleValue !== solutionValue) {
        errors.push(
          `Mismatch at [row=${row}, col=${col}]: puzzle=${puzzleValue}, solution=${solutionValue}`
        )
      }
    }
  }
  
  return errors
}

/**
 * Check if row/column indexing might be swapped
 */
function checkForIndexingIssues(puzzle: number[][], solution: number[][]): string[] {
  const warnings: string[] = []
  
  // Try transposed comparison
  let transposedMatches = 0
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      // Check if puzzle[row][col] matches solution[col][row]
      if (puzzle[row][col] !== 0 && puzzle[row][col] === solution[col][row]) {
        transposedMatches++
      }
    }
  }
  
  if (transposedMatches > 0) {
    warnings.push(
      `Possible indexing issue: ${transposedMatches} cells match when using solution[col][row] instead of solution[row][col]`
    )
  }
  
  return warnings
}

/**
 * Count clues in puzzle
 */
function countClues(puzzle: number[][]): number {
  let count = 0
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (puzzle[row][col] !== 0) {
        count++
      }
    }
  }
  return count
}

/**
 * Validate a single puzzle
 */
function validatePuzzle(puzzleData: SudokuPuzzleData): ValidationResult {
  const result: ValidationResult = {
    puzzleId: puzzleData.id,
    difficulty: puzzleData.difficulty,
    valid: true,
    errors: [],
    warnings: [],
    clueCount: 0,
  }
  
  // Count clues
  result.clueCount = countClues(puzzleData.puzzle)
  
  // Verify structure
  if (puzzleData.puzzle.length !== 9 || puzzleData.solution.length !== 9) {
    result.errors.push('Not 9x9 structure')
    result.valid = false
    return result
  }
  
  for (let i = 0; i < 9; i++) {
    if (puzzleData.puzzle[i].length !== 9) {
      result.errors.push(`Puzzle row ${i} has ${puzzleData.puzzle[i].length} columns`)
      result.valid = false
    }
    if (puzzleData.solution[i].length !== 9) {
      result.errors.push(`Solution row ${i} has ${puzzleData.solution[i].length} columns`)
      result.valid = false
    }
  }
  
  if (!result.valid) return result
  
  // Verify solution is valid Sudoku
  const solutionErrors = verifySolutionIsValid(puzzleData.solution)
  if (solutionErrors.length > 0) {
    result.errors.push(...solutionErrors)
    result.valid = false
  }
  
  // Verify puzzle clues match solution
  const matchErrors = verifyPuzzleMatchesSolution(puzzleData.puzzle, puzzleData.solution)
  if (matchErrors.length > 0) {
    result.errors.push(...matchErrors)
    result.valid = false
  }
  
  // Check for indexing issues
  const indexingWarnings = checkForIndexingIssues(puzzleData.puzzle, puzzleData.solution)
  if (indexingWarnings.length > 0) {
    result.warnings.push(...indexingWarnings)
  }
  
  // Check clue count appropriateness
  if (result.clueCount < 17) {
    result.warnings.push(`Very few clues (${result.clueCount}), may have multiple solutions`)
  }
  
  if (puzzleData.difficulty === 'easy' && result.clueCount < 35) {
    result.warnings.push(`Easy puzzle has only ${result.clueCount} clues (typically 35-45)`)
  }
  
  if (puzzleData.difficulty === 'hard' && (result.clueCount < 22 || result.clueCount > 30)) {
    result.warnings.push(`Hard puzzle has ${result.clueCount} clues (expected 22-30)`)
  }
  
  return result
}

/**
 * Run validation on all puzzles
 */
export function runFullValidation(): void {
  console.log('🔍 Starting Comprehensive Sudoku Validation...\n')
  
  const allPuzzles: SudokuPuzzleData[] = [
    ...easyPuzzles,
    ...mediumPuzzles,
    ...hardPuzzles,
  ]
  
  const results: ValidationResult[] = []
  
  allPuzzles.forEach(puzzle => {
    const result = validatePuzzle(puzzle)
    results.push(result)
    
    if (result.valid) {
      console.log(`✅ ${result.puzzleId} (${result.difficulty}): Valid - ${result.clueCount} clues`)
    } else {
      console.log(`❌ ${result.puzzleId} (${result.difficulty}): INVALID`)
      result.errors.forEach(err => console.log(`   ERROR: ${err}`))
    }
    
    if (result.warnings.length > 0) {
      result.warnings.forEach(warn => console.log(`   ⚠️  WARNING: ${warn}`))
    }
  })
  
  // Summary
  console.log('\n📊 Validation Summary:')
  console.log(`Total puzzles: ${results.length}`)
  console.log(`Valid: ${results.filter(r => r.valid).length}`)
  console.log(`Invalid: ${results.filter(r => !r.valid).length}`)
  console.log(`With warnings: ${results.filter(r => r.warnings.length > 0).length}`)
  
  // Difficulty breakdown
  console.log('\n📈 Clue Count by Difficulty:')
  const byDifficulty = {
    easy: results.filter(r => r.difficulty === 'easy'),
    medium: results.filter(r => r.difficulty === 'medium'),
    hard: results.filter(r => r.difficulty === 'hard'),
  }
  
  Object.entries(byDifficulty).forEach(([diff, puzzles]) => {
    const clues = puzzles.map(p => p.clueCount)
    const avg = clues.reduce((a, b) => a + b, 0) / clues.length
    const min = Math.min(...clues)
    const max = Math.max(...clues)
    console.log(`${diff}: ${puzzles.length} puzzles, clues: ${min}-${max} (avg: ${avg.toFixed(1)})`)
  })
  
  // Check for any critical errors
  const invalidPuzzles = results.filter(r => !r.valid)
  if (invalidPuzzles.length > 0) {
    console.log('\n❌ CRITICAL: Invalid puzzles detected!')
    throw new Error(`${invalidPuzzles.length} invalid puzzle(s) found`)
  }
  
  console.log('\n✅ All puzzles validated successfully!')
}

// Export for testing
export { validatePuzzle, verifySolutionIsValid, verifyPuzzleMatchesSolution }
