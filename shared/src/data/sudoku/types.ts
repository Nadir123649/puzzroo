/**
 * Sudoku Puzzle Data Types
 */

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface SudokuPuzzleData {
  id: string
  difficulty: Difficulty
  puzzle: number[][]
  solution: number[][]
}

export interface PuzzleDataset {
  easy: SudokuPuzzleData[]
  medium: SudokuPuzzleData[]
  hard: SudokuPuzzleData[]
}
