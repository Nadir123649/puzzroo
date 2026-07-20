/**
 * Loader / dataset integrity test for the generated Sudoku datasets.
 *
 * Heavy checks (unique-solution guarantee, technique rating) live in the
 * Python validator (tools/puzzle-generators/validate_sudoku_dataset.py).
 * This test guards the TS loader: it decodes the JSON, exposes the same
 * `puzzleDataset` / `getRandomPuzzle` / `getPuzzleById` API, and that every
 * record is structurally sound and consistent with its solution.
 */
import { describe, it, expect } from 'vitest'
import { puzzleDataset, getRandomPuzzle, getPuzzleById } from '../../../shared/src/data/sudoku'

const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'] as const

describe('Sudoku dataset (generated)', () => {
  it('exposes all four difficulties with a flagship pool', () => {
    for (const d of DIFFICULTIES) {
      expect(puzzleDataset[d].length, `${d} count`).toBeGreaterThanOrEqual(900)
    }
  })

  it('every puzzle is structurally valid and consistent with its solution', () => {
    for (const d of DIFFICULTIES) {
      const ids = new Set<string>()
      for (const p of puzzleDataset[d]) {
        expect(p.id, 'id present').toBeTruthy()
        expect(ids.has(p.id), `unique id ${p.id}`).toBe(false)
        ids.add(p.id)

        expect(p.puzzle.length, '9 rows').toBe(9)
        expect(p.solution.length, '9 rows').toBe(9)

        for (let r = 0; r < 9; r++) {
          expect(p.puzzle[r].length, '9 cols').toBe(9)
          expect(p.solution[r].length, '9 cols').toBe(9)
          for (let c = 0; c < 9; c++) {
            const given = p.puzzle[r][c]
            const sol = p.solution[r][c]
            expect(sol, 'solution cell 1-9').toBeGreaterThanOrEqual(1)
            expect(sol, 'solution cell 1-9').toBeLessThanOrEqual(9)
            if (given !== 0) {
              expect(given, `given matches solution at ${r},${c}`).toBe(sol)
              expect(given, 'given 1-9').toBeGreaterThanOrEqual(1)
              expect(given, 'given 1-9').toBeLessThanOrEqual(9)
            }
          }
        }
      }
    }
  })

  it('getRandomPuzzle returns a valid puzzle of the requested difficulty', () => {
    for (const d of DIFFICULTIES) {
      const p = getRandomPuzzle(d)
      expect(p.difficulty).toBe(d)
      expect(puzzleDataset[d]).toContain(p)
    }
  })

  it('getPuzzleById resolves across difficulties', () => {
    const first = puzzleDataset.easy[0]
    expect(getPuzzleById(first.id)?.id).toBe(first.id)
    expect(getPuzzleById('definitely-not-a-real-id')).toBeNull()
  })
})
