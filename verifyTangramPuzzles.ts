/**
 * Tangram Puzzle Verification Script
 * Validates all puzzle data structures and piece configurations
 */

import { easyPuzzles } from './src/data/tangram/easy'
import { mediumPuzzles } from './src/data/tangram/medium'
import { hardPuzzles } from './src/data/tangram/hard'
import { TangramPieceType } from './src/types/tangram'

const ALL_PIECE_TYPES: TangramPieceType[] = [
  'large-triangle-1',
  'large-triangle-2',
  'medium-triangle',
  'small-triangle-1',
  'small-triangle-2',
  'square',
  'parallelogram',
]

const VALID_ROTATIONS = [0, 45, 90, 135, 180, 225, 270, 315]

function verifyPuzzle(puzzle: any, index: number, difficulty: string): boolean {
  let isValid = true
  const prefix = `[${difficulty.toUpperCase()}][${index + 1}] ${puzzle.title}`

  // Check required fields
  if (!puzzle.id) {
    console.error(`${prefix}: Missing 'id'`)
    isValid = false
  }
  if (!puzzle.title) {
    console.error(`${prefix}: Missing 'title'`)
    isValid = false
  }
  if (!puzzle.silhouette) {
    console.error(`${prefix}: Missing 'silhouette'`)
    isValid = false
  }
  if (!puzzle.solution) {
    console.error(`${prefix}: Missing 'solution'`)
    isValid = false
  }
  if (!puzzle.timeLimit || puzzle.timeLimit <= 0) {
    console.error(`${prefix}: Invalid 'timeLimit': ${puzzle.timeLimit}`)
    isValid = false
  }

  // Check all 7 pieces are present
  const solutionPieces = Object.keys(puzzle.solution)
  if (solutionPieces.length !== 7) {
    console.error(`${prefix}: Expected 7 pieces, got ${solutionPieces.length}`)
    isValid = false
  }

  // Check all required piece types exist
  for (const pieceType of ALL_PIECE_TYPES) {
    if (!puzzle.solution[pieceType]) {
      console.error(`${prefix}: Missing piece '${pieceType}'`)
      isValid = false
    } else {
      const piece = puzzle.solution[pieceType]
      
      // Verify position structure
      if (typeof piece.x !== 'number') {
        console.error(`${prefix}: Invalid x coordinate for '${pieceType}'`)
        isValid = false
      }
      if (typeof piece.y !== 'number') {
        console.error(`${prefix}: Invalid y coordinate for '${pieceType}'`)
        isValid = false
      }
      if (typeof piece.rotation !== 'number') {
        console.error(`${prefix}: Invalid rotation for '${pieceType}'`)
        isValid = false
      }
      
      // Verify rotation is valid
      if (!VALID_ROTATIONS.includes(piece.rotation)) {
        console.error(`${prefix}: Invalid rotation ${piece.rotation} for '${pieceType}' (must be 0, 45, 90, 135, 180, 225, 270, or 315)`)
        isValid = false
      }
    }
  }

  if (isValid) {
    console.log(`${prefix}: ✓ Valid`)
  }

  return isValid
}

function main() {
  console.log('\n=== TANGRAM PUZZLE VERIFICATION ===\n')

  let totalValid = 0
  let totalInvalid = 0

  console.log('--- EASY PUZZLES ---')
  easyPuzzles.forEach((puzzle, index) => {
    if (verifyPuzzle(puzzle, index, 'easy')) {
      totalValid++
    } else {
      totalInvalid++
    }
  })

  console.log('\n--- MEDIUM PUZZLES ---')
  mediumPuzzles.forEach((puzzle, index) => {
    if (verifyPuzzle(puzzle, index, 'medium')) {
      totalValid++
    } else {
      totalInvalid++
    }
  })

  console.log('\n--- HARD PUZZLES ---')
  hardPuzzles.forEach((puzzle, index) => {
    if (verifyPuzzle(puzzle, index, 'hard')) {
      totalValid++
    } else {
      totalInvalid++
    }
  })

  console.log('\n=== SUMMARY ===')
  console.log(`Total Puzzles: ${totalValid + totalInvalid}`)
  console.log(`Valid: ${totalValid}`)
  console.log(`Invalid: ${totalInvalid}`)
  
  if (totalInvalid === 0) {
    console.log('\n✓ All puzzles are valid!')
    process.exit(0)
  } else {
    console.log('\n✗ Some puzzles have errors. Please fix them.')
    process.exit(1)
  }
}

main()
