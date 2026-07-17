import { CrossMathPuzzle } from '@shared/lib/crossmath/types'

export const mediumPuzzles: CrossMathPuzzle[] = [
  {
    id: 'medium-1',
    difficulty: 'medium',
    rows: 9,
    columns: 11,
    maxMistakes: 4,
    availableNumbers: [1, 2, 3, 5, 6, 11, 12, 13, 17, 18, 23, 33],
    grid: [
      // Row 0
      [
        { type: 'empty', isEditable: false, row: 0, col: 0 },
        { type: 'empty', isEditable: false, row: 0, col: 1 },
        { type: 'number', value: 30, isEditable: false, row: 0, col: 2 },
        { type: 'empty', isEditable: false, row: 0, col: 3 },
        { type: 'empty', isEditable: false, row: 0, col: 4 },
        { type: 'empty', isEditable: false, row: 0, col: 5 },
        { type: 'number', value: 22, isEditable: false, row: 0, col: 6 },
        { type: 'empty', isEditable: false, row: 0, col: 7 },
        { type: 'empty', isEditable: false, row: 0, col: 8 },
        { type: 'empty', isEditable: false, row: 0, col: 9 },
        { type: 'empty', isEditable: false, row: 0, col: 10 },
      ],
      // Row 1
      [
        { type: 'empty', isEditable: false, row: 1, col: 0 },
        { type: 'empty', isEditable: false, row: 1, col: 1 },
        { type: 'operator', value: '÷', isEditable: false, row: 1, col: 2 },
        { type: 'empty', isEditable: false, row: 1, col: 3 },
        { type: 'empty', isEditable: false, row: 1, col: 4 },
        { type: 'empty', isEditable: false, row: 1, col: 5 },
        { type: 'operator', value: '+', isEditable: false, row: 1, col: 6 },
        { type: 'empty', isEditable: false, row: 1, col: 7 },
        { type: 'empty', isEditable: false, row: 1, col: 8 },
        { type: 'empty', isEditable: false, row: 1, col: 9 },
        { type: 'empty', isEditable: false, row: 1, col: 10 },
      ],
      // Row 2
      [
        { type: 'number', value: 28, isEditable: false, row: 2, col: 0 },
        { type: 'operator', value: '+', isEditable: false, row: 2, col: 1 },
        { type: 'empty', isEditable: true, row: 2, col: 2 }, // Solution: 5
        { type: 'operator', value: '=', isEditable: false, row: 2, col: 3 },
        { type: 'empty', isEditable: true, row: 2, col: 4 }, // Solution: 33
        { type: 'empty', isEditable: false, row: 2, col: 5 },
        { type: 'empty', isEditable: true, row: 2, col: 6 }, // Solution: 1
        { type: 'operator', value: '+', isEditable: false, row: 2, col: 7 },
        { type: 'empty', isEditable: true, row: 2, col: 8 }, // Solution: 12
        { type: 'operator', value: '=', isEditable: false, row: 2, col: 9 },
        { type: 'empty', isEditable: true, row: 2, col: 10 }, // Solution: 13
      ],
      // Row 3
      [
        { type: 'empty', isEditable: false, row: 3, col: 0 },
        { type: 'empty', isEditable: false, row: 3, col: 1 },
        { type: 'operator', value: '=', isEditable: false, row: 3, col: 2 },
        { type: 'empty', isEditable: false, row: 3, col: 3 },
        { type: 'empty', isEditable: false, row: 3, col: 4 },
        { type: 'empty', isEditable: false, row: 3, col: 5 },
        { type: 'operator', value: '=', isEditable: false, row: 3, col: 6 },
        { type: 'empty', isEditable: false, row: 3, col: 7 },
        { type: 'empty', isEditable: false, row: 3, col: 8 },
        { type: 'empty', isEditable: false, row: 3, col: 9 },
        { type: 'operator', value: '-', isEditable: false, row: 3, col: 10 },
      ],
      // Row 4
      [
        { type: 'number', value: 2, isEditable: false, row: 4, col: 0 },
        { type: 'empty', isEditable: false, row: 4, col: 1 },
        { type: 'empty', isEditable: true, row: 4, col: 2 }, // Solution: 6
        { type: 'operator', value: '+', isEditable: false, row: 4, col: 3 },
        { type: 'empty', isEditable: true, row: 4, col: 4 }, // Solution: 17
        { type: 'operator', value: '=', isEditable: false, row: 4, col: 5 },
        { type: 'empty', isEditable: true, row: 4, col: 6 }, // Solution: 23
        { type: 'empty', isEditable: false, row: 4, col: 7 },
        { type: 'empty', isEditable: true, row: 4, col: 8 }, // Solution: 11
        { type: 'empty', isEditable: false, row: 4, col: 9 },
        { type: 'number', value: 12, isEditable: false, row: 4, col: 10 },
      ],
      // Row 5
      [
        { type: 'operator', value: '+', isEditable: false, row: 5, col: 0 },
        { type: 'empty', isEditable: false, row: 5, col: 1 },
        { type: 'empty', isEditable: false, row: 5, col: 2 },
        { type: 'empty', isEditable: false, row: 5, col: 3 },
        { type: 'operator', value: 'x', isEditable: false, row: 5, col: 4 },
        { type: 'empty', isEditable: false, row: 5, col: 5 },
        { type: 'empty', isEditable: false, row: 5, col: 6 },
        { type: 'empty', isEditable: false, row: 5, col: 7 },
        { type: 'operator', value: 'x', isEditable: false, row: 5, col: 8 },
        { type: 'empty', isEditable: false, row: 5, col: 9 },
        { type: 'operator', value: '=', isEditable: false, row: 5, col: 10 },
      ],
      // Row 6
      [
        { type: 'empty', isEditable: true, row: 6, col: 0 }, // Solution: 18
        { type: 'operator', value: '÷', isEditable: false, row: 6, col: 1 },
        { type: 'number', value: 18, isEditable: false, row: 6, col: 2 },
        { type: 'operator', value: '=', isEditable: false, row: 6, col: 3 },
        { type: 'number', value: 1, isEditable: false, row: 6, col: 4 },
        { type: 'empty', isEditable: false, row: 6, col: 5 },
        { type: 'empty', isEditable: true, row: 6, col: 6 }, // Solution: 3
        { type: 'operator', value: '-', isEditable: false, row: 6, col: 7 },
        { type: 'empty', isEditable: true, row: 6, col: 8 }, // Solution: 2
        { type: 'operator', value: '=', isEditable: false, row: 6, col: 9 },
        { type: 'empty', isEditable: true, row: 6, col: 10 }, // Solution: 1
      ],
      // Row 7
      [
        { type: 'operator', value: '=', isEditable: false, row: 7, col: 0 },
        { type: 'empty', isEditable: false, row: 7, col: 1 },
        { type: 'empty', isEditable: false, row: 7, col: 2 },
        { type: 'empty', isEditable: false, row: 7, col: 3 },
        { type: 'operator', value: '=', isEditable: false, row: 7, col: 4 },
        { type: 'empty', isEditable: false, row: 7, col: 5 },
        { type: 'empty', isEditable: false, row: 7, col: 6 },
        { type: 'empty', isEditable: false, row: 7, col: 7 },
        { type: 'operator', value: '=', isEditable: false, row: 7, col: 8 },
        { type: 'empty', isEditable: false, row: 7, col: 9 },
        { type: 'empty', isEditable: false, row: 7, col: 10 },
      ],
      // Row 8
      [
        { type: 'number', value: 20, isEditable: false, row: 8, col: 0 },
        { type: 'operator', value: '-', isEditable: false, row: 8, col: 1 },
        { type: 'number', value: 3, isEditable: false, row: 8, col: 2 },
        { type: 'operator', value: '=', isEditable: false, row: 8, col: 3 },
        { type: 'empty', isEditable: true, row: 8, col: 4 }, // Solution: 17
        { type: 'empty', isEditable: false, row: 8, col: 5 },
        { type: 'empty', isEditable: false, row: 8, col: 6 },
        { type: 'empty', isEditable: false, row: 8, col: 7 },
        { type: 'number', value: 22, isEditable: false, row: 8, col: 8 },
        { type: 'empty', isEditable: false, row: 8, col: 9 },
        { type: 'empty', isEditable: false, row: 8, col: 10 },
      ],
    ],
    solution: {
      '2-2': 5,
      '2-4': 33,
      '2-6': 1,
      '2-8': 12,
      '2-10': 13,
      '4-2': 6,
      '4-4': 17,
      '4-6': 23,
      '4-8': 11,
      '6-0': 18,
      '6-6': 3,
      '6-8': 2,
      '6-10': 1,
      '8-4': 17,
    },
  },
]
