// CrossMath Type Definitions

export type Difficulty = 'easy' | 'medium' | 'hard'

export type CellType = 'number' | 'operator' | 'empty'

export interface Cell {
  type: CellType
  value?: number | string // number for filled/empty cells, string for operators
  isEditable: boolean
  isCorrect?: boolean
  isError?: boolean
  row: number
  col: number
}

export interface CrossMathPuzzle {
  id: string
  difficulty: Difficulty
  rows: number
  columns: number
  grid: Cell[][]
  availableNumbers: number[]
  maxMistakes: number
  solution: Record<string, number> // Key format: 'row-col', Value: correct number
}

export interface GameState {
  board: Cell[][]
  selectedCell: { row: number; col: number } | null
  mistakes: number
  maxMistakes: number
  score: number
  time: number
  gameStatus: 'playing' | 'won' | 'lost'
  difficulty: Difficulty
  availableNumbers: Set<number>
}
