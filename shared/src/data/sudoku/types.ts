/**
 * Sudoku Puzzle Data Types
 */

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'expert' | 'expert'

export interface SudokuPuzzleData {
  id: string
  difficulty: Difficulty
  puzzle: number[][]
  solution: number[][]
  /** Technique tier 1-4 (see puzzlegen/sudoku/rating.py). Present on generated datasets. */
  tier?: number
  /** Technique names fired by the rater. */
  techniques?: string[]
  /** Number of pre-filled cells. */
  givens?: number
}

export interface PuzzleDataset {
  easy: SudokuPuzzleData[]
  medium: SudokuPuzzleData[]
  hard: SudokuPuzzleData[]
  expert: SudokuPuzzleData[]
}
