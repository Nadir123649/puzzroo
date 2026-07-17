/**
 * CrossMath Constants
 * Game configuration and constant values
 */

export const MAX_MISTAKES = 5

export const INITIAL_GAME_STATE = {
  mistakes: 0,
  maxMistakes: MAX_MISTAKES,
  score: 0,
  time: 0,
  gameStatus: 'playing' as const,
}

export const SCORING = {
  CORRECT_ANSWER: 10,
  WRONG_ANSWER: -5,
  HINT_COST: -20,
  HINT_SCORE_REQUIRED: 20, // Need 20 score for 1 hint
}

export const KEYBOARD_KEYS = {
  NUMBERS: ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
  DELETE: ['Backspace', 'Delete'],
  ARROWS: ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'],
} as const
