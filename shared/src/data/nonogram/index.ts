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

function buildPool(raw: unknown): PuzzleData[] {
  return (raw as RawRecord[]).map(decode)
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
  const puzzles = getPuzzlesByDifficulty(difficulty)
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
