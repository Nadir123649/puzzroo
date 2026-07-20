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

function buildPool(raw: unknown): SudokuPuzzleData[] {
  const records = raw as RawRecord[]
  return records.map(toPuzzle)
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
  const puzzles = puzzleDataset[difficulty]

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
