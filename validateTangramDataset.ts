/**
 * Standalone Tangram Dataset Validator (CLI)
 * Run: npx tsx validateTangramDataset.ts
 * Verifies every generated puzzle is a valid exact tiling of the 7 pieces.
 */

import { POLYGON_DATASETS } from '@shared/data/tangram/polygon-datasets'
import { validateAll } from '@shared/data/tangram/tangramValidation'
import type { TangramDifficulty } from '@shared/data/tangram'

const counts: Record<TangramDifficulty, number> = { easy: 0, medium: 0, hard: 0 }
for (const p of POLYGON_DATASETS) counts[p.difficulty]++

console.log('\n╔' + '═'.repeat(64) + '╗')
console.log('║' + ' TANGRAM POLYGON DATASET VALIDATOR '.padEnd(64) + '║')
console.log('╚' + '═'.repeat(64) + '╝\n')

console.log(`Puzzles: ${POLYGON_DATASETS.length}  (easy ${counts.easy}, medium ${counts.medium}, hard ${counts.hard})`)

const report = validateAll(POLYGON_DATASETS)

let exitCode = 0
for (const diff of ['easy', 'medium', 'hard'] as TangramDifficulty[]) {
  const subset = POLYGON_DATASETS.filter((p) => p.difficulty === diff)
  const r = validateAll(subset)
  const status = r.invalid === 0 ? '✓' : '✗'
  console.log(`  ${status} ${diff.padEnd(6)} ${r.valid}/${r.total} valid`)
  if (r.invalid > 0) {
    exitCode = 1
    for (const res of r.results.filter((x) => !x.valid)) {
      console.error(`    ✗ ${res.id}: ${res.errors.join('; ')}`)
    }
  }
}

console.log('')
if (exitCode === 0) {
  console.log('✓ ALL TANGRAM PUZZLES VALIDATED SUCCESSFULLY')
} else {
  console.error('✗ Some tangram puzzles failed validation')
}
process.exit(exitCode)
