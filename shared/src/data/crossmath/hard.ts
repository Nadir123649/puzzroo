import { CrossMathPuzzle } from '@shared/lib/crossmath/types'

export const hardPuzzles: CrossMathPuzzle[] = [
  {
    id: 'hard-1',
    difficulty: 'hard',
    rows: 9,
    columns: 11,
    maxMistakes: 3,
    availableNumbers: [-4, 1, 3, 7, 8, 10, 15, 20, 23, 28, 30, 36, 230],
    grid: [
      // Row 0
      [
        { type: 'number', value: 10, isEditable: false, row: 0, col: 0 },
        { type: 'operator', value: '-', isEditable: false, row: 0, col: 1 },
        { type: 'empty', isEditable: true, row: 0, col: 2 }, // Solution: 7
        { type: 'operator', value: '=', isEditable: false, row: 0, col: 3 },
        { type: 'empty', isEditable: true, row: 0, col: 4 }, // Solution: 3
        { type: 'empty', isEditable: false, row: 0, col: 5 },
        { type: 'empty', isEditable: false, row: 0, col: 6 },
        { type: 'empty', isEditable: false, row: 0, col: 7 },
        { type: 'empty', isEditable: false, row: 0, col: 8 },
        { type: 'empty', isEditable: false, row: 0, col: 9 },
        { type: 'empty', isEditable: false, row: 0, col: 10 },
      ],
      // Row 1
      [
        { type: 'operator', value: '+', isEditable: false, row: 1, col: 0 },
        { type: 'empty', isEditable: false, row: 1, col: 1 },
        { type: 'empty', isEditable: false, row: 1, col: 2 },
        { type: 'empty', isEditable: false, row: 1, col: 3 },
        { type: 'operator', value: '+', isEditable: false, row: 1, col: 4 },
        { type: 'empty', isEditable: false, row: 1, col: 5 },
        { type: 'empty', isEditable: false, row: 1, col: 6 },
        { type: 'empty', isEditable: false, row: 1, col: 7 },
        { type: 'empty', isEditable: false, row: 1, col: 8 },
        { type: 'empty', isEditable: false, row: 1, col: 9 },
        { type: 'empty', isEditable: false, row: 1, col: 10 },
      ],
      // Row 2
      [
        { type: 'empty', isEditable: true, row: 2, col: 0 }, // Solution: 15
        { type: 'empty', isEditable: false, row: 2, col: 1 },
        { type: 'empty', isEditable: true, row: 2, col: 2 }, // Solution: 230
        { type: 'operator', value: '÷', isEditable: false, row: 2, col: 3 },
        { type: 'number', value: 5, isEditable: false, row: 2, col: 4 },
        { type: 'operator', value: '=', isEditable: false, row: 2, col: 5 },
        { type: 'number', value: 46, isEditable: false, row: 2, col: 6 },
        { type: 'empty', isEditable: false, row: 2, col: 7 },
        { type: 'number', value: 3, isEditable: false, row: 2, col: 8 },
        { type: 'empty', isEditable: false, row: 2, col: 9 },
        { type: 'empty', isEditable: false, row: 2, col: 10 },
      ],
      // Row 3
      [
        { type: 'operator', value: '=', isEditable: false, row: 3, col: 0 },
        { type: 'empty', isEditable: false, row: 3, col: 1 },
        { type: 'empty', isEditable: false, row: 3, col: 2 },
        { type: 'empty', isEditable: false, row: 3, col: 3 },
        { type: 'operator', value: '=', isEditable: false, row: 3, col: 4 },
        { type: 'empty', isEditable: false, row: 3, col: 5 },
        { type: 'operator', value: '-', isEditable: false, row: 3, col: 6 },
        { type: 'empty', isEditable: false, row: 3, col: 7 },
        { type: 'operator', value: '+', isEditable: false, row: 3, col: 8 },
        { type: 'empty', isEditable: false, row: 3, col: 9 },
        { type: 'empty', isEditable: false, row: 3, col: 10 },
      ],
      // Row 4
      [
        { type: 'number', value: 25, isEditable: false, row: 4, col: 0 },
        { type: 'empty', isEditable: false, row: 4, col: 1 },
        { type: 'empty', isEditable: true, row: 4, col: 2 }, // Solution: 28
        { type: 'operator', value: '+', isEditable: false, row: 4, col: 3 },
        { type: 'empty', isEditable: true, row: 4, col: 4 }, // Solution: 8
        { type: 'operator', value: '=', isEditable: false, row: 4, col: 5 },
        { type: 'empty', isEditable: true, row: 4, col: 6 }, // Solution: 36
        { type: 'empty', isEditable: false, row: 4, col: 7 },
        { type: 'number', value: 17, isEditable: false, row: 4, col: 8 },
        { type: 'empty', isEditable: false, row: 4, col: 9 },
        { type: 'number', value: 30, isEditable: false, row: 4, col: 10 },
      ],
      // Row 5
      [
        { type: 'empty', isEditable: false, row: 5, col: 0 },
        { type: 'empty', isEditable: false, row: 5, col: 1 },
        { type: 'operator', value: '=', isEditable: false, row: 5, col: 2 },
        { type: 'empty', isEditable: false, row: 5, col: 3 },
        { type: 'empty', isEditable: false, row: 5, col: 4 },
        { type: 'empty', isEditable: false, row: 5, col: 5 },
        { type: 'operator', value: '=', isEditable: false, row: 5, col: 6 },
        { type: 'empty', isEditable: false, row: 5, col: 7 },
        { type: 'operator', value: '=', isEditable: false, row: 5, col: 8 },
        { type: 'empty', isEditable: false, row: 5, col: 9 },
        { type: 'operator', value: '÷', isEditable: false, row: 5, col: 10 },
      ],
      // Row 6
      [
        { type: 'number', value: 24, isEditable: false, row: 6, col: 0 },
        { type: 'operator', value: '-', isEditable: false, row: 6, col: 1 },
        { type: 'empty', isEditable: true, row: 6, col: 2 }, // Solution: 28
        { type: 'operator', value: '=', isEditable: false, row: 6, col: 3 },
        { type: 'empty', isEditable: true, row: 6, col: 4 }, // Solution: -4
        { type: 'empty', isEditable: false, row: 6, col: 5 },
        { type: 'empty', isEditable: true, row: 6, col: 6 }, // Solution: 10
        { type: 'operator', value: '+', isEditable: false, row: 6, col: 7 },
        { type: 'empty', isEditable: true, row: 6, col: 8 }, // Solution: 20
        { type: 'operator', value: '=', isEditable: false, row: 6, col: 9 },
        { type: 'number', value: 30, isEditable: false, row: 6, col: 10 },
      ],
      // Row 7
      [
        { type: 'empty', isEditable: false, row: 7, col: 0 },
        { type: 'empty', isEditable: false, row: 7, col: 1 },
        { type: 'operator', value: '=', isEditable: false, row: 7, col: 2 },
        { type: 'empty', isEditable: false, row: 7, col: 3 },
        { type: 'empty', isEditable: false, row: 7, col: 4 },
        { type: 'empty', isEditable: false, row: 7, col: 5 },
        { type: 'empty', isEditable: false, row: 7, col: 6 },
        { type: 'empty', isEditable: false, row: 7, col: 7 },
        { type: 'empty', isEditable: false, row: 7, col: 8 },
        { type: 'empty', isEditable: false, row: 7, col: 9 },
        { type: 'operator', value: '=', isEditable: false, row: 7, col: 10 },
      ],
      // Row 8
      [
        { type: 'empty', isEditable: true, row: 8, col: 0 }, // Solution: 23
        { type: 'operator', value: '+', isEditable: false, row: 8, col: 1 },
        { type: 'empty', isEditable: true, row: 8, col: 2 }, // Solution: 28
        { type: 'operator', value: '=', isEditable: false, row: 8, col: 3 },
        { type: 'number', value: 51, isEditable: false, row: 8, col: 4 },
        { type: 'empty', isEditable: false, row: 8, col: 5 },
        { type: 'number', value: 2, isEditable: false, row: 8, col: 6 },
        { type: 'operator', value: '-', isEditable: false, row: 8, col: 7 },
        { type: 'number', value: 1, isEditable: false, row: 8, col: 8 },
        { type: 'operator', value: '=', isEditable: false, row: 8, col: 9 },
        { type: 'empty', isEditable: true, row: 8, col: 10 }, // Solution: 1
      ],
    ],
    solution: {
      '0-2': 7,
      '0-4': 3,
      '2-0': 15,
      '2-2': 230,
      '4-2': 28,
      '4-4': 8,
      '4-6': 36,
      '6-2': 28,
      '6-4': -4,
      '6-6': 10,
      '6-8': 20,
      '8-0': 23,
      '8-2': 28,
      '8-10': 1,
    },
  },
]
