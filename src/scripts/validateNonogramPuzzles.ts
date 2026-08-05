/**
 * Validation script for the Nonogram dataset (shared/src/data/nonogram)
 * Run with: npx tsx src/scripts/validateNonogramPuzzles.ts
 */

import {
  puzzleRegistry,
  allPuzzles,
  puzzleCounts,
} from '@shared/data/nonogram'
import { generateRowClues, generateColumnClues } from '@shared/lib/nonogram/helpers'

const TARGET_PER_DIFFICULTY: Record<string, number> = {
  easy: 50,
  medium: 1000,
  hard: 1000,
}
const EXPECTED_SIZES: Record<string, number[]> = {
  easy: [10],
  medium: [10],
  hard: [15],
}

console.log('🔍 Starting Nonogram Puzzle Data Integrity Audit...')
console.log('='.repeat(60))

try {
  for (const [diff, puzzles] of Object.entries(puzzleRegistry)) {
    if (puzzles.length !== TARGET_PER_DIFFICULTY[diff]) {
      throw new Error(`${diff}: expected ${TARGET_PER_DIFFICULTY[diff]} puzzles, got ${puzzles.length}`)
    }

    const sizes = new Set(puzzles.map((p) => p.size))
    if (JSON.stringify([...sizes].sort()) !== JSON.stringify([...EXPECTED_SIZES[diff]].sort())) {
      throw new Error(`${diff}: unexpected sizes ${[...sizes]} (expected ${EXPECTED_SIZES[diff]})`)
    }

    for (const p of puzzles) {
      if (p.solution.length !== p.size || p.solution.some((row) => row.length !== p.size)) {
        throw new Error(`${p.id}: solution dimensions do not match size ${p.size}`)
      }
      const expectedRows = generateRowClues(p.solution)
      const expectedCols = generateColumnClues(p.solution)
      if (JSON.stringify(p.rowClues) !== JSON.stringify(expectedRows)) {
        throw new Error(`${p.id}: rowClues do not match solution`)
      }
      if (JSON.stringify(p.columnClues) !== JSON.stringify(expectedCols)) {
        throw new Error(`${p.id}: columnClues do not match solution`)
      }
    }

    console.log(`  [OK] ${diff}: ${puzzles.length} puzzles, sizes ${EXPECTED_SIZES[diff]}`)
  }

  const ids = new Set<string>()
  for (const p of allPuzzles) {
    if (ids.has(p.id)) throw new Error(`duplicate id ${p.id}`)
    ids.add(p.id)
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ ALL PUZZLE DATASETS PASSED VALIDATION!')
  console.log(`Total puzzles validated: ${puzzleCounts.total}`)
  console.log('='.repeat(60))

  process.exit(0)
} catch (error) {
  console.error('\n' + '='.repeat(60))
  console.error('❌ VALIDATION FAILED!')
  console.error('='.repeat(60))
  console.error(error)
  process.exit(1)
}
