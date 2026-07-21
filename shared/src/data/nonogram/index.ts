/**
 * Nonogram Puzzle Dataset (generated)
 *
 * Source of truth: tools/puzzle-generators/export_nonogram.py writes
 *   shared/src/data/nonogram/{easy,medium,hard,expert}.json
 * Each JSON record stores the solution compactly as a `sol` 0/1 string plus
 * `rowClues`/`columnClues` as number[][]. This module decodes them into the
 * app's PuzzleData shape (solution: number[][]; rowClues/columnClues: Clue[]).
 *
 * Every puzzle is uniqueness-guaranteed and line-solvable (no guessing),
 * verified by validate_nonogram_dataset.py at generation time.
 */

import easyJson from './easy.json'
import mediumJson from './medium.json'
import hardJson from './hard.json'
import expertJson from './expert.json'
import type { Difficulty, PuzzleData } from '@shared/lib/nonogram/types'
import { dailyPuzzles } from './daily'

interface RawRecord {
  id: string
  title: string
  difficulty: Difficulty
  size: number
  category: string
  estimatedTime: number
  sol: string
  rowClues: number[][]
  columnClues: number[][]
  _hash?: string
  uniqueSolution?: boolean
  fillDensity?: number
}

function decode(raw: RawRecord): PuzzleData {
  const size = raw.size
  const solution: number[][] = []
  for (let r = 0; r < size; r++) {
    const row: number[] = []
    for (let c = 0; c < size; c++) {
      row.push(Number(raw.sol[r * size + c]))
    }
    solution.push(row)
  }
  return {
    id: raw.id,
    title: raw.title,
    difficulty: raw.difficulty,
    size: size as PuzzleData['size'],
    category: raw.category,
    estimatedTime: raw.estimatedTime,
    solution,
    rowClues: raw.rowClues.map((values) => ({ values })),
    columnClues: raw.columnClues.map((values) => ({ values })),
  }
}

function computeLineClues(line: number[]): number[] {
  const clues: number[] = []
  let run = 0
  for (const v of line) {
    if (v === 1) {
      run++
    } else if (run > 0) {
      clues.push(run)
      run = 0
    }
  }
  if (run > 0) clues.push(run)
  return clues
}

/**
 * Structural sanity check for a decoded nonogram puzzle: square solution of
 * 0/1 cells, clue arrays sized to the grid, and clues that actually match the
 * solution (so a broken dataset can't ship an unsolvable board).
 */
export function sanityCheckNonogram(p: PuzzleData): string[] {
  const errors: string[] = []
  const size = p.size
  if (!Array.isArray(p.solution) || p.solution.length !== size) {
    errors.push(`solution rows ${p.solution?.length ?? 'no'} != ${size}`)
    return errors
  }
  for (let r = 0; r < size; r++) {
    const row = p.solution[r]
    if (!Array.isArray(row) || row.length !== size) {
      errors.push(`solution[${r}] has ${row?.length ?? 'no'} columns`)
      continue
    }
    for (const v of row) {
      if (v !== 0 && v !== 1) {
        errors.push(`solution[${r}] contains invalid cell ${v}`)
        break
      }
    }
  }
  if (p.rowClues.length !== size) errors.push(`rowClues length ${p.rowClues.length} != ${size}`)
  if (p.columnClues.length !== size) errors.push(`columnClues length ${p.columnClues.length} != ${size}`)
  if (errors.length > 0) return errors

  for (let r = 0; r < size; r++) {
    const got = computeLineClues(p.solution[r]).join(',')
    const exp = p.rowClues[r].values.join(',')
    if (got !== exp) errors.push(`row ${r} clues [${exp}] != solution clues [${got}]`)
  }
  for (let c = 0; c < size; c++) {
    const col = p.solution.map((row) => row[c])
    const got = computeLineClues(col).join(',')
    const exp = p.columnClues[c].values.join(',')
    if (got !== exp) errors.push(`column ${c} clues [${exp}] != solution clues [${got}]`)
  }
  return errors
}

function buildPool(raw: unknown): PuzzleData[] {
  const out: PuzzleData[] = []
  for (const r of raw as RawRecord[]) {
    const p = decode(r)
    const errs = sanityCheckNonogram(p)
    if (errs.length) {
      console.error(`[nonogram] skipping invalid puzzle ${p.id}: ${errs.join('; ')}`)
      continue
    }
    out.push(p)
  }
  return out
}

export const easyPuzzles: PuzzleData[] = buildPool(easyJson)
export const mediumPuzzles: PuzzleData[] = buildPool(mediumJson)
export const hardPuzzles: PuzzleData[] = buildPool(hardJson)
export const expertPuzzles: PuzzleData[] = buildPool(expertJson)

// Puzzle Registry - Central source of truth
export const puzzleRegistry: Record<Difficulty, PuzzleData[]> = {
  easy: easyPuzzles,
  medium: mediumPuzzles,
  hard: hardPuzzles,
  expert: expertPuzzles,
}

// All puzzles flattened
export const allPuzzles: PuzzleData[] = [
  ...easyPuzzles,
  ...mediumPuzzles,
  ...hardPuzzles,
  ...expertPuzzles,
]

// Daily puzzles
export { dailyPuzzles }

// Get puzzle by ID
export function getPuzzleById(id: string): PuzzleData | undefined {
  return allPuzzles.find((p) => p.id === id) || dailyPuzzles.find((p) => p.id === id)
}

// Get puzzles by difficulty
export function getPuzzlesByDifficulty(difficulty: Difficulty): PuzzleData[] {
  return puzzleRegistry[difficulty] || []
}

// Get random puzzle by difficulty (for backward compatibility)
export function getRandomPuzzle(difficulty: Difficulty): PuzzleData {
  let puzzles = getPuzzlesByDifficulty(difficulty)
  if (puzzles.length === 0) {
    for (const d of ['easy', 'medium', 'hard', 'expert'] as Difficulty[]) {
      const fb = getPuzzlesByDifficulty(d)
      if (fb.length > 0) { puzzles = fb; break }
    }
  }
  if (puzzles.length === 0) throw new Error(`No nonogram puzzles available`)
  const randomIndex = Math.floor(Math.random() * puzzles.length)
  return puzzles[randomIndex]
}

// Get daily puzzle (rotates every day)
export function getTodaysDailyPuzzle(): PuzzleData {
  const today = new Date()
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000)
  const puzzleIndex = dayOfYear % dailyPuzzles.length
  return dailyPuzzles[puzzleIndex]
}

// Get puzzles by category
export function getPuzzlesByCategory(category: string): PuzzleData[] {
  return allPuzzles.filter((p) => p.category === category)
}

// Get all categories
export function getAllCategories(): string[] {
  const categories = new Set(allPuzzles.map((p) => p.category))
  return Array.from(categories).sort()
}

// Export puzzle counts
export const puzzleCounts = {
  easy: easyPuzzles.length,
  medium: mediumPuzzles.length,
  hard: hardPuzzles.length,
  expert: expertPuzzles.length,
  total: allPuzzles.length,
  daily: dailyPuzzles.length,
}
