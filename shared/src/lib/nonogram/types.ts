// Nonogram Type Definitions
// Phase 1: Foundation types for grid, cells, and puzzle data
// Phase 2: Game logic, validation, and progress tracking
// Phase 3: Input mode system with flip animation

export type CellState = 'empty' | 'filled' | 'marked' | 'error'

export type InputMode = 'fill' | 'mark'

export type GridSize = 10 | 15 | 20

export type Difficulty = 'easy' | 'medium' | 'hard'

export type ValidationStatus = 'incomplete' | 'completed' | 'invalid'

export type GameStatus = 'playing' | 'won' | 'lost' | 'paused'

export type ValidationMode = 'relaxed' | 'assisted' | 'challenge'

export interface Clue {
  values: number[]
}

export interface PuzzleData {
  id: string
  title: string
  difficulty: Difficulty
  size: GridSize
  category: string
  estimatedTime: number // seconds
  solution: number[][] // Binary matrix: 1 = filled, 0 = empty
  rowClues: Clue[]
  columnClues: Clue[]
}

export interface CellPosition {
  row: number
  col: number
}

export interface GameState {
  grid: CellState[][]
  selectedCell: CellPosition | null
  isComplete: boolean
}

// Phase 2: Extended types

export interface ClueStatus {
  status: ValidationStatus
  isHighlighted: boolean
}

export interface GameProgress {
  totalCellsRequired: number
  correctCellsFilled: number
  percentComplete: number
}

export interface TimerState {
  elapsedSeconds: number
  isRunning: boolean
}

export interface HintState {
  hintsUsed: number
  maxHints: number
}

export interface MistakeState {
  mistakeCount: number
  maxMistakes: number
  recentMistake: CellPosition | null
}

export interface GameStats {
  puzzlesCompleted: number
  bestTime: number
  totalPlayTime: number
  currentStreak: number
}

export interface SavedGameState {
  grid: CellState[][]
  puzzleId: string
  difficulty: Difficulty
  elapsedSeconds: number
  hintsUsed: number
  mistakeCount: number
  timestamp: number
}
