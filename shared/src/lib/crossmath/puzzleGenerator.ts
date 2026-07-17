/**
 * CrossMath Puzzle Generator
 * Generates complete, mathematically correct puzzles from board patterns.
 */

import { Cell, CrossMathPuzzle, Difficulty } from './types'
import {
  BoardPattern,
  getRandomPatternForDifficulty,
  getPatternById as findPatternById,
  patternToGameGrid,
} from '@shared/data/crossmath/patterns'

function createPRNG(seed: number) {
  let s = seed
  return function() {
    const x = Math.sin(s++) * 10000
    return x - Math.floor(x)
  }
}

function applyOp(a: number, op: string, b: number): number {
  switch (op) {
    case '+':
      return a + b
    case '−':
    case '-':
      return a - b
    default:
      return a + b
  }
}

function shuffle<T>(arr: T[], nextRand: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Solve pattern by assigning random operands (1-9) and evaluating row/column results.
 */
function solvePattern(
  pattern: BoardPattern,
  grid: Cell[][],
  nextRand: () => number
): Record<string, number> | null {
  const randomIntVal = (min: number, max: number) => {
    return Math.floor(nextRand() * (max - min + 1)) + min
  }

  for (let attempt = 0; attempt < 1000; attempt++) {
    const solution: Record<string, number> = {}

    // 1. Assign random numbers 1–9 to all non-result NUMBER cells
    const resultCellsSet = new Set<string>()
    for (const eq of pattern.equations) {
      const lastCell = eq.cells[eq.cells.length - 1]
      resultCellsSet.add(`${lastCell[0]}-${lastCell[1]}`)
    }

    for (const pc of pattern.cells) {
      if (pc.type === 'NUMBER') {
        const key = `${pc.row}-${pc.col}`
        if (!resultCellsSet.has(key)) {
          solution[key] = randomIntVal(1, 9)
        }
      }
    }

    // 2. Evaluate each equation to compute the result cells
    let allValid = true
    for (const eq of pattern.equations) {
      const values: number[] = []
      const operators: string[] = []

      for (const [r, c] of eq.cells) {
        const cell = grid[r][c]
        if (cell.type === 'operator') {
          operators.push(String(cell.value))
        } else {
          const key = `${r}-${c}`
          if (solution[key] !== undefined) {
            values.push(solution[key])
          }
        }
      }

      if (values.length < 1) {
        allValid = false
        break
      }

      let current = values[0]
      let opIndex = 0

      for (let i = 1; i < values.length; i++) {
        const op = operators[opIndex++]
        if (op === '=') break
        current = applyOp(current, op, values[i])
      }

      // Result must be reasonably sized and integer
      if (!Number.isInteger(current) || Math.abs(current) > 30) {
        allValid = false
        break
      }

      const lastCell = eq.cells[eq.cells.length - 1]
      solution[`${lastCell[0]}-${lastCell[1]}`] = current
    }

    if (allValid) {
      return solution
    }
  }

  return null
}

/**
 * Determine which cells become blanks (editable) based on difficulty.
 * Only inner cells are blanked; result cells are always predefined.
 */
function applyBlanks(
  grid: Cell[][],
  solution: Record<string, number>,
  difficulty: Difficulty,
  pattern: BoardPattern,
  nextRand: () => number
): void {
  // Collect all inner number cells (i.e. NUMBER cells in pattern that are NOT results)
  const resultCellsSet = new Set<string>()
  for (const eq of pattern.equations) {
    const lastCell = eq.cells[eq.cells.length - 1]
    resultCellsSet.add(`${lastCell[0]}-${lastCell[1]}`)
  }

  const innerCells: Cell[] = []
  for (const pc of pattern.cells) {
    if (pc.type === 'NUMBER') {
      const key = `${pc.row}-${pc.col}`
      if (!resultCellsSet.has(key)) {
        innerCells.push(grid[pc.row][pc.col])
      }
    }
  }

  // Pre-fill solved values in the grid first
  for (const pc of pattern.cells) {
    if (pc.type === 'NUMBER') {
      const cell = grid[pc.row][pc.col]
      cell.value = solution[`${pc.row}-${pc.col}`]
      cell.isEditable = false
    }
  }

  // Target blank counts by difficulty:
  const totalInner = innerCells.length
  let blankCount = 3
  if (difficulty === 'easy') {
    blankCount = Math.max(2, Math.round(totalInner * 0.45))
  } else if (difficulty === 'medium') {
    blankCount = Math.max(4, Math.round(totalInner * 0.60))
  } else {
    blankCount = Math.max(6, Math.round(totalInner * 0.75))
  }

  const shuffledInner = shuffle(innerCells, nextRand)
  for (let i = 0; i < Math.min(blankCount, shuffledInner.length); i++) {
    const cell = shuffledInner[i]
    cell.type = 'empty'
    cell.value = undefined
    cell.isEditable = true
  }
}

/**
 * Generate a complete CrossMathPuzzle from a pattern
 */
export function generatePuzzleFromPattern(
  pattern: BoardPattern,
  difficulty: Difficulty,
  seed?: number
): CrossMathPuzzle {
  const grid = patternToGameGrid(pattern)
  const finalSeed = seed !== undefined ? seed : Math.floor(Math.random() * 1000000)
  const nextRand = createPRNG(finalSeed)

  const solved = solvePattern(pattern, grid, nextRand)

  if (!solved) {
    // Fallback solver
    const fallbackSolution: Record<string, number> = {}
    for (const pc of pattern.cells) {
      if (pc.type === 'NUMBER') {
        fallbackSolution[`${pc.row}-${pc.col}`] = 5
      }
    }
    return buildPuzzle(pattern, grid, fallbackSolution, difficulty, nextRand)
  }

  return buildPuzzle(pattern, grid, solved, difficulty, nextRand)
}

function buildPuzzle(
  pattern: BoardPattern,
  grid: Cell[][],
  solution: Record<string, number>,
  difficulty: Difficulty,
  nextRand: () => number
): CrossMathPuzzle {
  applyBlanks(grid, solution, difficulty, pattern, nextRand)

  // Build availableNumbers from the solution values that are blanked
  const editableValues = new Set<number>()
  for (const key of Object.keys(solution)) {
    const [rStr, cStr] = key.split('-')
    const r = parseInt(rStr)
    const c = parseInt(cStr)
    if (grid[r][c].isEditable) {
      editableValues.add(solution[key])
    }
  }

  const availableNumbers = Array.from(editableValues).sort((a, b) => a - b)

  // Ensure minimum pad size
  const randomIntVal = (min: number, max: number) => {
    return Math.floor(nextRand() * (max - min + 1)) + min
  }
  while (availableNumbers.length < 4) {
    const num = randomIntVal(1, 9)
    if (!availableNumbers.includes(num)) {
      availableNumbers.push(num)
      availableNumbers.sort((a, b) => a - b)
    }
  }

  const maxMistakes = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 4 : 3

  return {
    id: `pattern-${pattern.pattern_id}-${Date.now()}-${Math.floor(nextRand() * 1000)}`,
    difficulty,
    rows: pattern.grid_rows,
    columns: pattern.grid_cols,
    grid,
    maxMistakes,
    availableNumbers,
    solution,
  }
}

/**
 * Generate a random puzzle using a pattern matched to difficulty
 */
export function generateRandomPatternPuzzle(
  difficulty: Difficulty,
  seed?: number
): CrossMathPuzzle {
  const finalSeed = seed !== undefined ? seed : Math.floor(Math.random() * 1000000)
  const nextRand = createPRNG(finalSeed)
  const pattern = getRandomPatternForDifficulty(difficulty)
  return generatePuzzleFromPattern(pattern, difficulty, finalSeed)
}

/**
 * Generate a puzzle from a specific pattern ID
 */
export function generatePuzzleByPatternId(
  patternId: number,
  difficulty: Difficulty,
  seed?: number
): CrossMathPuzzle | null {
  const pattern = findPatternById(patternId)
  if (!pattern) return null
  return generatePuzzleFromPattern(pattern, difficulty, seed)
}
