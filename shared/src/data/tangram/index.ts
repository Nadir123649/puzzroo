/**
 * Tangram Puzzle Datasets - Polygon-Based
 * Using polygon datasets only
 */

import { PolygonPuzzle } from '@shared/types/tangram-polygon'
import { easyPuzzles, getEasyPuzzle } from './easy'
import { mediumPuzzles, getMediumPuzzle } from './medium'
import { hardPuzzles, getHardPuzzle } from './hard'

export type TangramDifficulty = 'easy' | 'medium' | 'hard'

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
  const puzzles = getPuzzlesByDifficulty(difficulty)
  
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

