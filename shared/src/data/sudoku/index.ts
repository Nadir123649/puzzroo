/**
 * Sudoku Puzzle Dataset (generated)
 *
 * Source of truth: tools/puzzle-generators/export_sudoku.py writes
 *   shared/src/data/sudoku/{easy,medium,hard,expert}.json
 * Each JSON record stores `puzzle`/`solution` as 81-character strings
 * (0 = empty cell); this module decodes them into number[][] to keep the
 * rest of the app (useSudoku, etc.) unchanged.
 *
 * Every puzzle is uniqueness-guaranteed and technique-rated at generation
 * time (see puzzlegen/sudoku/rating.py). Runtime validation here is limited
 * to cheap structural checks; full uniqueness/rating checks run in the
 * dataset validator (tools/scripts) and a vitest test.
 */

import easyJson from './easy.json'
import mediumJson from './medium.json'
import hardJson from './hard.json'
import expertJson from './expert.json'
import type { Difficulty, SudokuPuzzleData, PuzzleDataset } from './types'

interface RawRecord {
  id: string
  difficulty: Difficulty
  puzzle: string
  solution: string
  givens?: number
  tier?: number
  techniques?: string[]
  solvableByLogic?: boolean
}

function decode81(s: string): number[][] {
  const board: number[][] = []
  for (let r = 0; r < 9; r++) {
    const row: number[] = []
    for (let c = 0; c < 9; c++) {
      row.push(Number(s[r * 9 + c]))
    }
    board.push(row)
  }
  return board
}

function toPuzzle(r: RawRecord): SudokuPuzzleData {
  return {
    id: r.id,
    difficulty: r.difficulty,
    puzzle: decode81(r.puzzle),
    solution: decode81(r.solution),
    givens: r.givens,
    tier: r.tier,
    techniques: r.techniques,
  }
}

/**
 * Cheap structural + correctness sanity check for a decoded sudoku puzzle.
 * Runs at dataset-load time and at serve time so a corrupt record is caught
 * before it reaches a player. Returns a list of human-readable errors.
 */
export function sanityCheckSudoku(p: SudokuPuzzleData): string[] {
  const errors: string[] = []
  const g = p.puzzle
  const s = p.solution
  if (!Array.isArray(g) || g.length !== 9) {
    errors.push('puzzle is not 9 rows')
    return errors
  }
  if (!Array.isArray(s) || s.length !== 9) {
    errors.push('solution is not 9 rows')
    return errors
  }
  for (let r = 0; r < 9; r++) {
    if (!Array.isArray(g[r]) || g[r].length !== 9) {
      errors.push(`puzzle row ${r} has ${g[r]?.length ?? 'no'} columns`)
      continue
    }
    if (!Array.isArray(s[r]) || s[r].length !== 9) {
      errors.push(`solution row ${r} has ${s[r]?.length ?? 'no'} columns`)
      continue
    }
    for (let c = 0; c < 9; c++) {
      const pv = g[r][c]
      const sv = s[r][c]
      if (!Number.isInteger(pv) || pv < 0 || pv > 9) {
        errors.push(`puzzle[${r}][${c}]=${pv} out of range`)
      }
      if (!Number.isInteger(sv) || sv < 1 || sv > 9) {
        errors.push(`solution[${r}][${c}]=${sv} out of range`)
      } else if (pv !== 0 && pv !== sv) {
        errors.push(`puzzle[${r}][${c}]=${pv} != solution ${sv}`)
      }
    }
  }
  if (errors.length > 0) return errors
  const ok = (lines: number[][]) =>
    lines.every((line) => {
      if (line.length !== 9) return false
      const set = new Set(line)
      return set.size === 9 && !set.has(0)
    })
  const cols = Array.from({ length: 9 }, (_, c) => s.map((row) => row[c]))
  const boxes = Array.from({ length: 9 }, (_, b) => {
    const br = Math.floor(b / 3) * 3
    const bc = (b % 3) * 3
    const out: number[] = []
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) out.push(s[br + i][bc + j])
    return out
  })
  if (!ok(s) || !ok(cols) || !ok(boxes)) {
    errors.push('solution is not a valid completed sudoku')
  }
  return errors
}

function buildPool(raw: unknown): SudokuPuzzleData[] {
  const records = raw as RawRecord[]
  const out: SudokuPuzzleData[] = []
  for (const r of records) {
    const p = toPuzzle(r)
    const errs = sanityCheckSudoku(p)
    if (errs.length) {
      console.error(`[sudoku] skipping invalid puzzle ${p.id}: ${errs.join('; ')}`)
      continue
    }
    out.push(p)
  }
  return out
}

export const puzzleDataset: PuzzleDataset = {
  easy: buildPool(easyJson),
  medium: buildPool(mediumJson),
  hard: buildPool(hardJson),
  expert: buildPool(expertJson),
}

/**
 * Get random puzzle from specified difficulty.
 * Avoids immediate repeats using lastPuzzleId.
 */
export function getRandomPuzzle(
  difficulty: Difficulty,
  lastPuzzleId?: string
): SudokuPuzzleData {
  let puzzles = puzzleDataset[difficulty]

  if (puzzles.length === 0) {
    for (const d of ['easy', 'medium', 'hard', 'expert'] as Difficulty[]) {
      const fb = puzzleDataset[d]
      if (fb.length > 0) { puzzles = fb; break }
    }
  }

  if (puzzles.length === 0) {
    throw new Error(`No puzzles available for difficulty: ${difficulty}`)
  }

  if (puzzles.length === 1) {
    return puzzles[0]
  }

  const available = lastPuzzleId
    ? puzzles.filter((p) => p.id !== lastPuzzleId)
    : puzzles
  const selectFrom = available.length > 0 ? available : puzzles

  const randomIndex = Math.floor(Math.random() * selectFrom.length)
  return selectFrom[randomIndex]
}

/**
 * Get puzzle by ID (searches all difficulties).
 */
export function getPuzzleById(id: string): SudokuPuzzleData | null {
  for (const diff of ['easy', 'medium', 'hard', 'expert'] as Difficulty[]) {
    const found = puzzleDataset[diff].find((p) => p.id === id)
    if (found) return found
  }
  return null
}

export type { Difficulty, SudokuPuzzleData, PuzzleDataset }
