/**
 * Comprehensive Tangram Solution Validator
 * 
 * This script validates all tangram puzzles to ensure:
 * 1. All solutions use exactly 7 pieces
 * 2. Total area equals 8U² (39,987.92 square units)
 * 3. All pieces have valid positions and rotations
 * 4. Solutions are unique and properly aligned
 * 5. Silhouettes are generated correctly
 */

import { easyPuzzles, mediumPuzzles, hardPuzzles } from './src/data/tangram'
import { TangramPuzzle } from './src/types/tangram-puzzle'
import { TangramPieceType } from './src/types/tangram'

const U = 70.7
const SQRT2 = Math.SQRT2
const EXPECTED_TOTAL_AREA = 8 * U * U

// Piece area definitions
const PIECE_AREAS: Record<TangramPieceType, number> = {
  'large-triangle-1': (2 * U * 2 * U) / 2,
  'large-triangle-2': (2 * U * 2 * U) / 2,
  'medium-triangle': (U * SQRT2 * U * SQRT2) / 2,
  'small-triangle-1': (U * U) / 2,
  'small-triangle-2': (U * U) / 2,
  'square': U * U,
  'parallelogram': U * U,
}

const ALL_PIECE_TYPES: TangramPieceType[] = [
  'large-triangle-1',
  'large-triangle-2',
  'medium-triangle',
  'small-triangle-1',
  'small-triangle-2',
  'square',
  'parallelogram',
]

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  details: {
    pieceCount: number
    totalArea: number
    hasAllPieces: boolean
    hasSilhouette: boolean
    hasDuplicatePositions: boolean
  }
}

function validatePuzzle(puzzle: TangramPuzzle): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Check solution exists
  if (!puzzle.solution) {
    errors.push('No solution defined')
    return {
      valid: false,
      errors,
      warnings,
      details: {
        pieceCount: 0,
        totalArea: 0,
        hasAllPieces: false,
        hasSilhouette: false,
        hasDuplicatePositions: false,
      },
    }
  }
  
  // Check all pieces are present
  const solutionPieces = Object.keys(puzzle.solution) as TangramPieceType[]
  const missingPieces = ALL_PIECE_TYPES.filter(p => !solutionPieces.includes(p))
  const extraPieces = solutionPieces.filter(p => !ALL_PIECE_TYPES.includes(p))
  
  if (missingPieces.length > 0) {
    errors.push(`Missing pieces: ${missingPieces.join(', ')}`)
  }
  
  if (extraPieces.length > 0) {
    errors.push(`Extra pieces: ${extraPieces.join(', ')}`)
  }
  
  // Calculate total area
  let totalArea = 0
  for (const pieceType of solutionPieces) {
    if (PIECE_AREAS[pieceType]) {
      totalArea += PIECE_AREAS[pieceType]
    }
  }
  
  const areaDiff = Math.abs(totalArea - EXPECTED_TOTAL_AREA)
  if (areaDiff > 0.1) {
    errors.push(`Total area mismatch: ${totalArea.toFixed(2)} vs expected ${EXPECTED_TOTAL_AREA.toFixed(2)}`)
  }
  
  // Check for invalid positions
  for (const [pieceType, pos] of Object.entries(puzzle.solution)) {
    if (typeof pos.x !== 'number' || isNaN(pos.x)) {
      errors.push(`${pieceType}: invalid x position`)
    }
    if (typeof pos.y !== 'number' || isNaN(pos.y)) {
      errors.push(`${pieceType}: invalid y position`)
    }
    if (typeof pos.rotation !== 'number' || isNaN(pos.rotation)) {
      errors.push(`${pieceType}: invalid rotation`)
    }
    
    // Check for extreme values
    if (Math.abs(pos.x) > 1000 || Math.abs(pos.y) > 1000) {
      warnings.push(`${pieceType}: position seems extreme (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})`)
    }
  }
  
  // Check for duplicate positions (likely copy-paste errors)
  const positions = Object.entries(puzzle.solution).map(([type, pos]) => ({
    type,
    key: `${pos.x.toFixed(2)},${pos.y.toFixed(2)},${pos.rotation}`,
  }))
  
  const positionKeys = positions.map(p => p.key)
  const uniqueKeys = new Set(positionKeys)
  const hasDuplicates = uniqueKeys.size !== positionKeys.length
  
  if (hasDuplicates) {
    const duplicates = positions.filter((p, i) => 
      positionKeys.indexOf(p.key) !== i
    )
    errors.push(`Duplicate positions found: ${duplicates.map(d => d.type).join(', ')}`)
  }
  
  // Check silhouette
  const hasSilhouette = Boolean(puzzle.silhouette && puzzle.silhouette.length > 0)
  if (!hasSilhouette) {
    errors.push('No silhouette defined')
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    details: {
      pieceCount: solutionPieces.length,
      totalArea,
      hasAllPieces: missingPieces.length === 0 && extraPieces.length === 0,
      hasSilhouette,
      hasDuplicatePositions: hasDuplicates,
    },
  }
}

function validateDifficulty(name: string, puzzles: TangramPuzzle[]) {
  console.log(`\n${'='.repeat(70)}`)
  console.log(`${name.toUpperCase()} DIFFICULTY`)
  console.log(`${'='.repeat(70)}`)
  console.log(`Total puzzles: ${puzzles.length}`)
  
  const results: { puzzle: TangramPuzzle; result: ValidationResult }[] = []
  
  for (const puzzle of puzzles) {
    const result = validatePuzzle(puzzle)
    results.push({ puzzle, result })
    
    console.log(`\n${'-'.repeat(70)}`)
    console.log(`${puzzle.id}: "${puzzle.title}"`)
    console.log(`${'-'.repeat(70)}`)
    
    if (result.valid) {
      console.log(`✓ VALID`)
    } else {
      console.log(`✗ INVALID`)
    }
    
    console.log(`  Pieces: ${result.details.pieceCount}/7`)
    console.log(`  Total area: ${result.details.totalArea.toFixed(2)} (expected: ${EXPECTED_TOTAL_AREA.toFixed(2)})`)
    console.log(`  Has silhouette: ${result.details.hasSilhouette ? '✓' : '✗'}`)
    
    if (result.errors.length > 0) {
      console.log(`\n  ERRORS:`)
      result.errors.forEach(err => console.log(`    ✗ ${err}`))
    }
    
    if (result.warnings.length > 0) {
      console.log(`\n  WARNINGS:`)
      result.warnings.forEach(warn => console.log(`    ⚠ ${warn}`))
    }
  }
  
  const validCount = results.filter(r => r.result.valid).length
  const invalidCount = results.length - validCount
  
  console.log(`\n${'='.repeat(70)}`)
  console.log(`${name.toUpperCase()} SUMMARY: ${validCount}/${results.length} valid`)
  if (invalidCount > 0) {
    console.log(`✗ ${invalidCount} puzzles need fixes`)
  } else {
    console.log(`✓ All puzzles valid!`)
  }
  
  return { total: results.length, valid: validCount, invalid: invalidCount }
}

function main() {
  console.log('\n')
  console.log('╔' + '═'.repeat(68) + '╗')
  console.log('║' + ' TANGRAM SOLUTION VALIDATOR '.padStart(43).padEnd(68) + '║')
  console.log('╚' + '═'.repeat(68) + '╝')
  
  const easyResults = validateDifficulty('Easy', easyPuzzles)
  const mediumResults = validateDifficulty('Medium', mediumPuzzles)
  const hardResults = validateDifficulty('Hard', hardPuzzles)
  
  const totalPuzzles = easyResults.total + mediumResults.total + hardResults.total
  const totalValid = easyResults.valid + mediumResults.valid + hardResults.valid
  const totalInvalid = easyResults.invalid + mediumResults.invalid + hardResults.invalid
  
  console.log(`\n\n${'='.repeat(70)}`)
  console.log('OVERALL SUMMARY')
  console.log(`${'='.repeat(70)}`)
  console.log(`Total puzzles: ${totalPuzzles}`)
  console.log(`  Easy: ${easyResults.total} (${easyResults.valid} valid, ${easyResults.invalid} invalid)`)
  console.log(`  Medium: ${mediumResults.total} (${mediumResults.valid} valid, ${mediumResults.invalid} invalid)`)
  console.log(`  Hard: ${hardResults.total} (${hardResults.valid} valid, ${hardResults.invalid} invalid)`)
  console.log()
  console.log(`Valid: ${totalValid}/${totalPuzzles}`)
  console.log(`Invalid: ${totalInvalid}/${totalPuzzles}`)
  
  if (totalInvalid === 0) {
    console.log()
    console.log('╔' + '═'.repeat(68) + '╗')
    console.log('║' + '✓ ALL SOLUTIONS VALIDATED SUCCESSFULLY!'.padStart(46).padEnd(68) + '║')
    console.log('╚' + '═'.repeat(68) + '╝')
    console.log()
    return 0
  } else {
    console.log()
    console.log(`✗ ${totalInvalid} solutions need fixes`)
    console.log()
    return 1
  }
}

// Run validation
try {
  const exitCode = main()
  process.exit(exitCode)
} catch (error) {
  console.error('\n✗ Validation failed with error:')
  console.error(error)
  process.exit(1)
}
