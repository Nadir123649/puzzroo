/**
 * Nonogram Puzzle Data Integrity Validator
 * Ensures all puzzle data is internally consistent
 */

import { PuzzleData, Clue } from './types'

/**
 * Calculate clues from a solution line (row or column)
 */
function calculateCluesFromLine(line: number[]): number[] {
  const clues: number[] = []
  let count = 0
  
  for (const cell of line) {
    if (cell === 1) {
      count++
    } else if (count > 0) {
      clues.push(count)
      count = 0
    }
  }
  
  if (count > 0) {
    clues.push(count)
  }
  
  // If no filled cells, return [0]
  return clues.length > 0 ? clues : [0]
}

/**
 * Validate a single puzzle
 */
export function validatePuzzleData(puzzle: PuzzleData): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  // Rule 1: Validate solution dimensions
  if (!puzzle.solution || puzzle.solution.length !== puzzle.size) {
    errors.push(`Solution has ${puzzle.solution?.length || 0} rows, expected ${puzzle.size}`)
    return { valid: false, errors }
  }
  
  for (let i = 0; i < puzzle.solution.length; i++) {
    if (puzzle.solution[i].length !== puzzle.size) {
      errors.push(`Solution row ${i} has ${puzzle.solution[i].length} cells, expected ${puzzle.size}`)
    }
  }
  
  // Rule 2: Validate row clues count
  if (puzzle.rowClues.length !== puzzle.size) {
    errors.push(`Has ${puzzle.rowClues.length} row clues, expected ${puzzle.size}`)
    return { valid: false, errors }
  }
  
  // Rule 3: Validate column clues count
  if (puzzle.columnClues.length !== puzzle.size) {
    errors.push(`Has ${puzzle.columnClues.length} column clues, expected ${puzzle.size}`)
    return { valid: false, errors }
  }
  
  // Rule 4: Validate each row
  for (let row = 0; row < puzzle.size; row++) {
    const solutionRow = puzzle.solution[row]
    const expectedClues = calculateCluesFromLine(solutionRow)
    const actualClues = puzzle.rowClues[row].values
    
    // Check if clues match
    if (JSON.stringify(expectedClues) !== JSON.stringify(actualClues)) {
      errors.push(
        `Row ${row}: Clue mismatch. Expected [${expectedClues.join(',')}], got [${actualClues.join(',')}]`
      )
    }
    
    // Rule 5: Zero-clue row integrity
    if (actualClues.length === 1 && actualClues[0] === 0) {
      const hasFilledCells = solutionRow.some(cell => cell === 1)
      if (hasFilledCells) {
        errors.push(
          `Row ${row}: Has clue [0] but contains filled cells in solution: [${solutionRow.join(',')}]`
        )
      }
    }
  }
  
  // Rule 6: Validate each column
  for (let col = 0; col < puzzle.size; col++) {
    const solutionColumn = puzzle.solution.map(row => row[col])
    const expectedClues = calculateCluesFromLine(solutionColumn)
    const actualClues = puzzle.columnClues[col].values
    
    // Check if clues match
    if (JSON.stringify(expectedClues) !== JSON.stringify(actualClues)) {
      errors.push(
        `Column ${col}: Clue mismatch. Expected [${expectedClues.join(',')}], got [${actualClues.join(',')}]`
      )
    }
    
    // Rule 7: Zero-clue column integrity
    if (actualClues.length === 1 && actualClues[0] === 0) {
      const hasFilledCells = solutionColumn.some(cell => cell === 1)
      if (hasFilledCells) {
        errors.push(
          `Column ${col}: Has clue [0] but contains filled cells in solution: [${solutionColumn.join(',')}]`
        )
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Validate all puzzles in a dataset
 */
export function validatePuzzleDataset(puzzles: PuzzleData[], datasetName: string): void {
  console.log(`\n🔍 Validating ${datasetName}...`)
  
  let totalErrors = 0
  
  for (const puzzle of puzzles) {
    const result = validatePuzzleData(puzzle)
    
    if (!result.valid) {
      console.error(`\n❌ Puzzle "${puzzle.id}" (${puzzle.title}) has errors:`)
      result.errors.forEach(error => console.error(`   - ${error}`))
      totalErrors += result.errors.length
    } else {
      console.log(`✅ Puzzle "${puzzle.id}" (${puzzle.title}) - Valid`)
    }
  }
  
  if (totalErrors === 0) {
    console.log(`\n✅ ${datasetName}: All ${puzzles.length} puzzles passed validation!`)
  } else {
    console.error(`\n❌ ${datasetName}: Found ${totalErrors} errors across ${puzzles.length} puzzles`)
    throw new Error(`${datasetName} validation failed with ${totalErrors} errors`)
  }
}

/**
 * Auto-fix puzzle clues based on solution
 */
export function autoFixPuzzleClues(puzzle: PuzzleData): PuzzleData {
  const fixedRowClues: Clue[] = []
  const fixedColumnClues: Clue[] = []
  
  // Recalculate row clues from solution
  for (let row = 0; row < puzzle.size; row++) {
    const clueValues = calculateCluesFromLine(puzzle.solution[row])
    fixedRowClues.push({ values: clueValues })
  }
  
  // Recalculate column clues from solution
  for (let col = 0; col < puzzle.size; col++) {
    const column = puzzle.solution.map(row => row[col])
    const clueValues = calculateCluesFromLine(column)
    fixedColumnClues.push({ values: clueValues })
  }
  
  return {
    ...puzzle,
    rowClues: fixedRowClues,
    columnClues: fixedColumnClues
  }
}
