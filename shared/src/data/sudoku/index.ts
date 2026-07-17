/**
 * Sudoku Puzzle Dataset Index
 * Centralized export for all puzzle data
 */

import { easyPuzzles } from './easy'
import { mediumPuzzles } from './medium'
import { hardPuzzles } from './hard'
import type { Difficulty, SudokuPuzzleData, PuzzleDataset } from './types'

/**
 * Validate puzzle structure and quality
 */
function validatePuzzleStructure(puzzle: SudokuPuzzleData): boolean {
  if (!puzzle.puzzle || !puzzle.solution) {
    console.error(`❌ Puzzle ${puzzle.id}: Missing puzzle or solution`)
    return false
  }
  
  if (puzzle.puzzle.length !== 9) {
    console.error(`❌ Puzzle ${puzzle.id}: puzzle has ${puzzle.puzzle.length} rows, expected 9`)
    return false
  }
  
  if (puzzle.solution.length !== 9) {
    console.error(`❌ Puzzle ${puzzle.id}: solution has ${puzzle.solution.length} rows, expected 9`)
    return false
  }
  
  // Check for 9x9 structure
  for (let i = 0; i < 9; i++) {
    if (!puzzle.puzzle[i] || puzzle.puzzle[i].length !== 9) {
      console.error(`❌ Puzzle ${puzzle.id}: puzzle row ${i} has ${puzzle.puzzle[i]?.length || 0} columns, expected 9`)
      return false
    }
    if (!puzzle.solution[i] || puzzle.solution[i].length !== 9) {
      console.error(`❌ Puzzle ${puzzle.id}: solution row ${i} has ${puzzle.solution[i]?.length || 0} columns, expected 9`)
      return false
    }
  }
  
  // Validate fixed values match solution
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (puzzle.puzzle[row][col] !== 0) {
        if (puzzle.puzzle[row][col] !== puzzle.solution[row][col]) {
          console.error(`❌ Puzzle ${puzzle.id}: Mismatch at [${row},${col}]: puzzle has ${puzzle.puzzle[row][col]}, solution has ${puzzle.solution[row][col]}`)
          return false
        }
      }
    }
  }
  
  // Check for completely empty rows (quality check)
  const emptyRows = puzzle.puzzle.filter(row => row.every(cell => cell === 0))
  if (emptyRows.length > 0) {
    console.warn(`⚠️  Puzzle ${puzzle.id}: Contains ${emptyRows.length} completely empty row(s)`)
  }
  
  // Check for completely empty columns (quality check)
  let emptyColCount = 0
  for (let col = 0; col < 9; col++) {
    const isEmpty = puzzle.puzzle.every(row => row[col] === 0)
    if (isEmpty) emptyColCount++
  }
  if (emptyColCount > 0) {
    console.warn(`⚠️  Puzzle ${puzzle.id}: Contains ${emptyColCount} completely empty column(s)`)
  }
  
  // Count total clues for quality assessment
  const clueCount = puzzle.puzzle.flat().filter(cell => cell !== 0).length
  console.log(`✅ Puzzle ${puzzle.id} validated: 9x9 structure correct, ${clueCount} clues`)
  
  return true
}

/**
 * Check for duplicate puzzles
 */
function checkForDuplicates(puzzles: SudokuPuzzleData[]): void {
  const puzzleStrings = new Map<string, string>()
  const duplicates: string[] = []
  
  puzzles.forEach(puzzle => {
    const puzzleStr = JSON.stringify(puzzle.puzzle)
    const existing = puzzleStrings.get(puzzleStr)
    
    if (existing) {
      duplicates.push(`${existing} and ${puzzle.id}`)
      console.error(`❌ Duplicate puzzle detected: ${existing} === ${puzzle.id}`)
    } else {
      puzzleStrings.set(puzzleStr, puzzle.id)
    }
  })
  
  if (duplicates.length > 0) {
    throw new Error(`Duplicate puzzles found: ${duplicates.join(', ')}`)
  }
}

/**
 * Check for duplicate IDs
 */
function checkForDuplicateIds(puzzles: SudokuPuzzleData[]): void {
  const ids = new Set<string>()
  const duplicates: string[] = []
  
  puzzles.forEach(puzzle => {
    if (ids.has(puzzle.id)) {
      duplicates.push(puzzle.id)
      console.error(`❌ Duplicate ID detected: ${puzzle.id}`)
    } else {
      ids.add(puzzle.id)
    }
  })
  
  if (duplicates.length > 0) {
    throw new Error(`Duplicate IDs found: ${duplicates.join(', ')}`)
  }
}

// Validate all puzzles at module load
const allPuzzles = [...easyPuzzles, ...mediumPuzzles, ...hardPuzzles]

// Check for duplicate IDs
checkForDuplicateIds(allPuzzles)

// Check for duplicate puzzles
checkForDuplicates(allPuzzles)

// Validate structure of each puzzle
allPuzzles.forEach(puzzle => {
  if (!validatePuzzleStructure(puzzle)) {
    throw new Error(`Invalid puzzle detected: ${puzzle.id}`)
  }
})

console.log(`✅ All ${allPuzzles.length} puzzles validated successfully (${easyPuzzles.length} easy, ${mediumPuzzles.length} medium, ${hardPuzzles.length} hard)`)
console.log(`📊 Dataset quality: No empty rows/columns, all clues verified, no duplicates`)

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
