/**
 * Tangram Hard Difficulty - Polygon-Based
 * Contains all 3 polygon puzzle datasets for Hard mode
 */

import { PolygonPuzzle } from '@/types/tangram-polygon'
import { POLYGON_DATASETS } from './polygon-datasets'

export function getHardPuzzle(): PolygonPuzzle {
  // Return a random hard puzzle
  const activePuzzles = POLYGON_DATASETS.filter(p => p.active && p.difficulty === 'hard')
  return activePuzzles[Math.floor(Math.random() * activePuzzles.length)]
}

export const hardPuzzles: PolygonPuzzle[] = POLYGON_DATASETS.filter(
  p => p.active && p.difficulty === 'hard'
)
