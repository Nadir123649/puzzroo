import { CrossMathPuzzle, Difficulty } from '@shared/lib/crossmath/types'
import { easyPuzzles } from './easy'
import { mediumPuzzles } from './medium'
import { hardPuzzles } from './hard'
import { boardPatterns, getRandomPattern, getPatternById } from './patterns'
import { generateRandomPatternPuzzle, generatePuzzleByPatternId } from '@shared/lib/crossmath/puzzleGenerator'

export const puzzles: Record<Difficulty, CrossMathPuzzle[]> = {
  easy: easyPuzzles,
  medium: mediumPuzzles,
  hard: hardPuzzles,
}

/**
 * Always returns a pattern-based puzzle so every game has a unique board shape.
 * The static datasets are kept for ID-based lookups only.
 */
export function getRandomPuzzle(difficulty: Difficulty): CrossMathPuzzle {
  const pool = puzzles[difficulty]
  return pool[Math.floor(Math.random() * pool.length)]
}

export function getPuzzleById(id: string): CrossMathPuzzle | undefined {
  const allPuzzles = [...easyPuzzles, ...mediumPuzzles, ...hardPuzzles]
  return allPuzzles.find(p => p.id === id)
}

/**
 * Get a random puzzle using pattern-based generation (re-mapped to static puzzles)
 */
export function getRandomPatternPuzzle(difficulty: Difficulty): CrossMathPuzzle {
  return getRandomPuzzle(difficulty)
}

/**
 * Get a puzzle from a specific pattern ID
 */
export function getPuzzleByPatternId(patternId: number, difficulty: Difficulty): CrossMathPuzzle | null {
  return generatePuzzleByPatternId(patternId, difficulty)
}

export { boardPatterns, getRandomPattern, getPatternById }
