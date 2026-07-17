/**
 * Past Puzzles - Easy Difficulty Dataset
 */

export interface PastPuzzleData {
  id: string
  difficulty: 'easy' | 'medium' | 'hard'
  shape: string
  date: string
  dayName: string
  puzzleConfig: any
}

export const easyPastPuzzles: PastPuzzleData[] = [
  {
    id: 'past-easy-1',
    difficulty: 'easy',
    shape: 'classic',
    date: '06-15-26',
    dayName: 'Monday',
    puzzleConfig: {
      // Actual puzzle data here
      type: 'sudoku',
      size: 9,
    }
  },
  {
    id: 'past-easy-2',
    difficulty: 'easy',
    shape: 'cross',
    date: '06-14-26',
    dayName: 'Sunday',
    puzzleConfig: {
      type: 'sudoku',
      size: 9,
    }
  },
  {
    id: 'past-easy-3',
    difficulty: 'easy',
    shape: 'snake',
    date: '06-13-26',
    dayName: 'Saturday',
    puzzleConfig: {
      type: 'sudoku',
      size: 9,
    }
  },
  {
    id: 'past-easy-4',
    difficulty: 'easy',
    shape: 'diamond',
    date: '06-12-26',
    dayName: 'Friday',
    puzzleConfig: {
      type: 'sudoku',
      size: 9,
    }
  },
  {
    id: 'past-easy-5',
    difficulty: 'easy',
    shape: 'maze',
    date: '06-11-26',
    dayName: 'Thursday',
    puzzleConfig: {
      type: 'sudoku',
      size: 9,
    }
  },
  {
    id: 'past-easy-6',
    difficulty: 'easy',
    shape: 'spiral',
    date: '06-10-26',
    dayName: 'Wednesday',
    puzzleConfig: {
      type: 'sudoku',
      size: 9,
    }
  },
  {
    id: 'past-easy-7',
    difficulty: 'easy',
    shape: 'classic',
    date: '06-09-26',
    dayName: 'Tuesday',
    puzzleConfig: {
      type: 'sudoku',
      size: 9,
    }
  },
  {
    id: 'past-easy-8',
    difficulty: 'easy',
    shape: 'cross',
    date: '06-08-26',
    dayName: 'Monday',
    puzzleConfig: {
      type: 'sudoku',
      size: 9,
    }
  },
]
