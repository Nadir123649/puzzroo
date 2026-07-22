import { puzzleDataset } from '@shared/data/sudoku'
import type { SudokuPuzzleData } from '@shared/data/sudoku/types'

interface ValidationResult {
  puzzleId: string
  difficulty: string
  valid: boolean
  errors: string[]
  warnings: string[]
  clueCount: number
}

export function verifySolutionIsValid(solution: number[][]): string[] {
  const errors: string[] = []

  for (let row = 0; row < 9; row++) {
    const rowSet = new Set(solution[row])
    if (rowSet.size !== 9) errors.push(`Row ${row} has duplicate values`)
    if (rowSet.has(0)) errors.push(`Row ${row} contains empty cells (0)`)
    for (let val = 1; val <= 9; val++) {
      if (!rowSet.has(val)) errors.push(`Row ${row} missing value ${val}`)
    }
  }

  for (let col = 0; col < 9; col++) {
    const colSet = new Set<number>()
    for (let row = 0; row < 9; row++) colSet.add(solution[row][col])
    if (colSet.size !== 9) errors.push(`Column ${col} has duplicate values`)
    if (colSet.has(0)) errors.push(`Column ${col} contains empty cells (0)`)
    for (let val = 1; val <= 9; val++) {
      if (!colSet.has(val)) errors.push(`Column ${col} missing value ${val}`)
    }
  }

  for (let boxRow = 0; boxRow < 3; boxRow++) {
    for (let boxCol = 0; boxCol < 3; boxCol++) {
      const boxSet = new Set<number>()
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          boxSet.add(solution[boxRow * 3 + r][boxCol * 3 + c])
        }
      }
      if (boxSet.size !== 9) errors.push(`Box [${boxRow},${boxCol}] has duplicate values`)
      if (boxSet.has(0)) errors.push(`Box [${boxRow},${boxCol}] contains empty cells (0)`)
      for (let val = 1; val <= 9; val++) {
        if (!boxSet.has(val)) errors.push(`Box [${boxRow},${boxCol}] missing value ${val}`)
      }
    }
  }

  return errors
}

export function verifyPuzzleMatchesSolution(puzzle: number[][], solution: number[][]): string[] {
  const errors: string[] = []
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      const puzzleValue = puzzle[row][col]
      const solutionValue = solution[row][col]
      if (puzzleValue !== 0 && puzzleValue !== solutionValue) {
        errors.push(`Mismatch at [row=${row}, col=${col}]: puzzle=${puzzleValue}, solution=${solutionValue}`)
      }
    }
  }
  return errors
}

function countClues(puzzle: number[][]): number {
  let count = 0
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (puzzle[row][col] !== 0) count++
    }
  }
  return count
}

function validatePuzzle(puzzleData: SudokuPuzzleData): ValidationResult {
  const result: ValidationResult = {
    puzzleId: puzzleData.id,
    difficulty: puzzleData.difficulty,
    valid: true,
    errors: [],
    warnings: [],
    clueCount: 0,
  }

  result.clueCount = countClues(puzzleData.puzzle)

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

  const solutionErrors = verifySolutionIsValid(puzzleData.solution)
  if (solutionErrors.length > 0) {
    result.errors.push(...solutionErrors)
    result.valid = false
  }

  const matchErrors = verifyPuzzleMatchesSolution(puzzleData.puzzle, puzzleData.solution)
  if (matchErrors.length > 0) {
    result.errors.push(...matchErrors)
    result.valid = false
  }

  if (result.clueCount < 17) {
    result.warnings.push(`Very few clues (${result.clueCount}), may have multiple solutions`)
  }

  return result
}

export function runFullValidation(): void {
  console.log('Starting Comprehensive Sudoku Validation...\n')

  const allPuzzles: SudokuPuzzleData[] = [
    ...puzzleDataset.easy,
    ...puzzleDataset.medium,
    ...puzzleDataset.hard,
    ...puzzleDataset.expert,
  ]

  const results: ValidationResult[] = allPuzzles.map(validatePuzzle)

  let validCount = 0
  let invalidCount = 0
  for (const r of results) {
    if (r.valid) {
      validCount++
    } else {
      invalidCount++
      console.log(`INVALID: ${r.puzzleId} (${r.difficulty})`)
      r.errors.forEach(err => console.log(`  ERROR: ${err}`))
    }
  }

  console.log(`\nValidation Summary:`)
  console.log(`Total puzzles: ${results.length}`)
  console.log(`Valid: ${validCount}`)
  console.log(`Invalid: ${invalidCount}`)

  const byDifficulty: Record<string, number[]> = {}
  for (const r of results) {
    if (!byDifficulty[r.difficulty]) byDifficulty[r.difficulty] = []
    byDifficulty[r.difficulty].push(r.clueCount)
  }

  console.log(`\nClue Count by Difficulty:`)
  for (const [diff, clues] of Object.entries(byDifficulty)) {
    const avg = clues.reduce((a, b) => a + b, 0) / clues.length
    const min = Math.min(...clues)
    const max = Math.max(...clues)
    console.log(`${diff}: ${clues.length} puzzles, clues: ${min}-${max} (avg: ${avg.toFixed(1)})`)
  }

  if (invalidCount > 0) {
    throw new Error(`${invalidCount} invalid puzzle(s) found`)
  }

  console.log('\nAll puzzles validated successfully!')
}

export { validatePuzzle }
