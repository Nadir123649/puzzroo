/**
 * Sudoku Type Definitions
 * Core types for the Sudoku game system
 */

export interface SudokuCell {
  value: number | null
  fixed: boolean
  notes?: number[]
  isError?: boolean // For validation errors
  isCorrect?: boolean // For correct entries
}

export type SudokuBoard = SudokuCell[][]

export interface Position {
  row: number
  col: number
}

export type GameStatus = 'playing' | 'paused' | 'won' | 'lost'

export type Difficulty = 'easy' | 'medium' | 'hard'

export interface SudokuState {
  currentBoard: SudokuBoard      // Current game state
  initialBoard: SudokuBoard      // Starting puzzle (for reset)
  solution: SudokuBoard | null   // Solution board (for validation in Phase 3)
  selectedCell: Position | null
  selectedNumber: number | null
  notesMode: boolean
  mistakes: number
  maxMistakes: number
  score: number
  time: number
  gameStatus: GameStatus
  difficulty: Difficulty
  currentPuzzleId: string | null
}

export type CellState = 'normal' | 'selected' | 'error' | 'highlighted'
