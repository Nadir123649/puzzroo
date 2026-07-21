/**
 * Tangram Puzzle Datasets - Polygon-Based
 * Using polygon datasets only
 */

import { PolygonPuzzle } from '@shared/types/tangram-polygon'
import { validatePuzzle } from './tangramValidation'
import { easyPuzzles, getEasyPuzzle } from './easy'
import { mediumPuzzles, getMediumPuzzle } from './medium'
import { hardPuzzles, getHardPuzzle } from './hard'

export type TangramDifficulty = 'easy' | 'medium' | 'hard'

/**
 * Reuse the geometry-based validator so a corrupt tangram puzzle is caught at
 * dataset-load / serve time (exact 7-piece tiling, area & outline match).
 */
export function sanityCheckTangram(p: PolygonPuzzle): string[] {
  return validatePuzzle(p).errors
}

// Surface any invalid puzzles from the pre-generated pools at load time.
for (const [diff, pool] of [
  ['easy', easyPuzzles],
  ['medium', mediumPuzzles],
  ['hard', hardPuzzles],
] as const) {
  for (const p of pool) {
    const errs = sanityCheckTangram(p)
    if (errs.length) {
      console.error(`[tangram] invalid ${diff} puzzle ${p.id}: ${errs.join('; ')}`)
    }
  }
}

export function getPuzzlesByDifficulty(difficulty: TangramDifficulty): PolygonPuzzle[] {
  switch (difficulty) {
    case 'easy':
      return easyPuzzles
    case 'medium':
      return mediumPuzzles
    case 'hard':
      return hardPuzzles
    default:
      return easyPuzzles
  }
}

export function getRandomPuzzle(difficulty: TangramDifficulty, excludeId?: string): PolygonPuzzle {
  let puzzles = getPuzzlesByDifficulty(difficulty)

  if (puzzles.length === 0) {
    for (const d of ['easy', 'medium', 'hard'] as TangramDifficulty[]) {
      const fb = getPuzzlesByDifficulty(d)
      if (fb.length > 0) { puzzles = fb; break }
    }
  }
  if (puzzles.length === 0) throw new Error('No tangram puzzles available')

  // If we have more than one puzzle and an excludeId is provided, exclude it
  if (puzzles.length > 1 && excludeId) {
    const filteredPuzzles = puzzles.filter(p => p.sourceId !== excludeId)
    if (filteredPuzzles.length > 0) {
      return filteredPuzzles[Math.floor(Math.random() * filteredPuzzles.length)]
    }
  }
  
  return puzzles[Math.floor(Math.random() * puzzles.length)]
}

export function isDifficultyLocked(difficulty: TangramDifficulty): boolean {
  return false // All difficulties now available
}

export { easyPuzzles, getEasyPuzzle, mediumPuzzles, getMediumPuzzle, hardPuzzles, getHardPuzzle }

