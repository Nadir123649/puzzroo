/**
 * Sudoku Constants
 * Game configuration and constant values
 */

export const BOARD_SIZE = 9
export const BOX_SIZE = 3
export const MAX_MISTAKES = 3
export const EMPTY_CELL = null

export const INITIAL_GAME_STATE = {
  mistakes: 0,
  maxMistakes: MAX_MISTAKES,
  score: 0,
  time: 2, // Mock time for now
  gameStatus: 'playing' as const,
}

export const KEYBOARD_KEYS = {
  NUMBERS: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
  DELETE: ['Backspace', 'Delete'],
  ARROWS: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
} as const
