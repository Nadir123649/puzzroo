/**
 * CrossMath Puzzle Dataset (pre-generated, uniqueness-guaranteed)
 *
 * Source of truth: tools/puzzle-generators/export_crossmath.py writes
 *   shared/src/data/crossmath/{easy,medium,hard}.json
 *
 * Each JSON record is COMPACT: it stores the full `solution` (operand + result
 * cells) and the `blanks` (editable operand cells) plus `patternId`. At runtime
 * we reconstruct the full `CrossMathPuzzle` (Cell[][] grid) via patterns.ts, so
 * the board shapes live in exactly one place (the patterns file) and the dataset
 * stays small.
 *
 * Every puzzle is guaranteed to have a UNIQUE solution: given the shown
 * operators and result cells, exactly one assignment of the blanked values
 * satisfies every equation (verified by the dataset validator at generation).
 */

import easyJson from './easy.json'
import mediumJson from './medium.json'
import hardJson from './hard.json'
import { Cell, CrossMathPuzzle, Difficulty } from '@shared/lib/crossmath/types'
import {
  BoardPattern,
  boardPatterns,
  getRandomPattern,
  getPatternById,
  patternToGameGrid,
} from './patterns'

interface RawRecord {
  id: string
  difficulty: Difficulty
  patternId: number
  solution: Record<string, number>
  blanks: string[]
  availableNumbers: number[]
  maxMistakes: number
  _hash?: string
}

function toPuzzle(rec: RawRecord): CrossMathPuzzle {
  const pattern: BoardPattern | undefined = getPatternById(rec.patternId)
  if (!pattern) {
    throw new Error(`CrossMath dataset references unknown patternId ${rec.patternId}`)
  }

  const grid: Cell[][] = patternToGameGrid(pattern)
  const blankSet = new Set(rec.blanks)

  for (const pc of pattern.cells) {
    if (pc.type === 'NUMBER') {
      const key = `${pc.row}-${pc.col}`
      const cell = grid[pc.row][pc.col]
      const value = rec.solution[key]
      if (value === undefined) continue
      if (blankSet.has(key)) {
        cell.type = 'empty'
        cell.value = undefined
        cell.isEditable = true
      } else {
        cell.type = 'number'
        cell.value = value
        cell.isEditable = false
      }
    }
  }

  return {
    id: rec.id,
    difficulty: rec.difficulty,
    patternId: rec.patternId,
    rows: pattern.grid_rows,
    columns: pattern.grid_cols,
    grid,
    availableNumbers: rec.availableNumbers,
    maxMistakes: rec.maxMistakes,
    solution: rec.solution,
  }
}

/**
 * Structural sanity check for a reconstructed CrossMath puzzle. Verifies the
 * pattern exists, every NUMBER cell has a solution value, blanks reference
 * real number cells (when supplied), and the rebuilt grid matches the pattern
 * dimensions.
 */
export function sanityCheckCrossMath(p: CrossMathPuzzle, blanks?: string[]): string[] {
  const errors: string[] = []
  const pid = p.patternId
  if (pid === undefined) {
    errors.push('missing patternId')
    return errors
  }
  const pattern = getPatternById(pid)
  if (!pattern) {
    errors.push(`unknown patternId ${pid}`)
    return errors
  }
  const numberKeys = pattern.cells
    .filter((c) => c.type === 'NUMBER')
    .map((c) => `${c.row}-${c.col}`)
  const numSet = new Set(numberKeys)
  for (const k of numberKeys) {
    if (typeof p.solution[k] !== 'number') {
      errors.push(`solution missing value for ${k}`)
    }
  }
  if (blanks) {
    for (const b of blanks) {
      if (!numSet.has(b)) errors.push(`blank ${b} is not a NUMBER cell`)
    }
  }
  if (p.grid.length !== p.rows) {
    errors.push(`grid rows ${p.grid.length} != declared ${p.rows}`)
  }
  if (p.grid[0]?.length !== p.columns) {
    errors.push(`grid cols ${p.grid[0]?.length} != declared ${p.columns}`)
  }
  return errors
}

function buildPool(raw: unknown): CrossMathPuzzle[] {
  const records = raw as RawRecord[]
  const out: CrossMathPuzzle[] = []
  for (const rec of records) {
    try {
      const p = toPuzzle(rec)
      const errs = sanityCheckCrossMath(p, rec.blanks)
      if (errs.length) {
        console.error(`[crossmath] skipping invalid puzzle ${p.id}: ${errs.join('; ')}`)
        continue
      }
      out.push(p)
    } catch (e) {
      console.error(`[crossmath] skipping puzzle ${rec.id}: ${(e as Error).message}`)
    }
  }
  return out
}

export const puzzleDataset: Record<Difficulty, CrossMathPuzzle[]> = {
  easy: buildPool(easyJson),
  medium: buildPool(mediumJson),
  hard: buildPool(hardJson),
}

/**
 * Always returns a pre-generated, uniqueness-guaranteed puzzle so every game has
 * a real board shape and a single solution.
 */
export function getRandomPuzzle(difficulty: Difficulty): CrossMathPuzzle {
  let pool = puzzleDataset[difficulty]
  if (pool.length === 0) {
    for (const d of ['easy', 'medium', 'hard'] as Difficulty[]) {
      const fb = puzzleDataset[d]
      if (fb.length > 0) { pool = fb; break }
    }
  }
  if (pool.length === 0) {
    throw new Error(`No puzzles available for difficulty: ${difficulty}`)
  }
  const idx = Math.floor(Math.random() * pool.length)
  return pool[idx]
}

export function getPuzzleById(id: string): CrossMathPuzzle | undefined {
  for (const diff of ['easy', 'medium', 'hard'] as Difficulty[]) {
    const found = puzzleDataset[diff].find((p) => p.id === id)
    if (found) return found
  }
  return undefined
}

/**
 * Get a random puzzle from the pre-generated dataset (alias of getRandomPuzzle).
 */
export function getRandomPatternPuzzle(difficulty: Difficulty): CrossMathPuzzle {
  return getRandomPuzzle(difficulty)
}

/**
 * Deterministically pick a puzzle from the dataset by seed (used for daily
 * challenges so they are stable and uniqueness-guaranteed).
 */
export function getDailyPatternPuzzle(difficulty: Difficulty, seed: number): CrossMathPuzzle {
  let pool = puzzleDataset[difficulty]
  if (pool.length === 0) {
    for (const d of ['easy', 'medium', 'hard'] as Difficulty[]) {
      const fb = puzzleDataset[d]
      if (fb.length > 0) { pool = fb; break }
    }
  }
  if (pool.length === 0) {
    throw new Error(`No puzzles available for difficulty: ${difficulty}`)
  }
  const idx = ((seed % pool.length) + pool.length) % pool.length
  return pool[idx]
}

export { boardPatterns, getRandomPattern, getPatternById }

