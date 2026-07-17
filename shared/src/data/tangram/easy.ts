/**
 * Tangram Easy Difficulty - Polygon-Based
 * Contains all 3 polygon puzzle datasets for Easy mode
 */

import { PolygonPuzzle } from '@shared/types/tangram-polygon'
import { POLYGON_DATASETS } from './polygon-datasets'

export function getEasyPuzzle(): PolygonPuzzle {
  // Return a random easy puzzle
  const activePuzzles = POLYGON_DATASETS.filter(p => p.active && p.difficulty === 'easy')
  return activePuzzles[Math.floor(Math.random() * activePuzzles.length)]
}

export const easyPuzzles: PolygonPuzzle[] = POLYGON_DATASETS.filter(
  p => p.active && p.difficulty === 'easy'
)
