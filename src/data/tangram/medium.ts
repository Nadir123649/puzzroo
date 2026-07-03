/**
 * Tangram Medium Difficulty - Polygon-Based
 * Contains all 3 polygon puzzle datasets for Medium mode
 */

import { PolygonPuzzle } from '@/types/tangram-polygon'
import { POLYGON_DATASETS } from './polygon-datasets'

export function getMediumPuzzle(): PolygonPuzzle {
  // Return a random medium puzzle
  const activePuzzles = POLYGON_DATASETS.filter(p => p.active && p.difficulty === 'medium')
  return activePuzzles[Math.floor(Math.random() * activePuzzles.length)]
}

export const mediumPuzzles: PolygonPuzzle[] = POLYGON_DATASETS.filter(
  p => p.active && p.difficulty === 'medium'
)
