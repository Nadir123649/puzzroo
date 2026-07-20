/**
 * Loader / dataset integrity test for the generated CrossMath datasets.
 *
 * The heavy check (unique-solution guarantee) lives in the Python validator
 * (tools/puzzle-generators/validate_crossmath_dataset.py). This test guards the
 * TS loader: it reconstructs every record into a CrossMathPuzzle, and asserts
 * structural soundness — grid dimensions match the pattern, blank cells are
 * editable+empty, solution keys cover all pattern NUMBER cells, result cells
 * are non-editable, and availableNumbers match the blanked values.
 */
import { describe, it, expect } from 'vitest'
import { puzzleDataset, getRandomPuzzle, getPuzzleById } from '../../../shared/src/data/crossmath'
import { getPatternById } from '../../../shared/src/data/crossmath/patterns'

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const

describe('CrossMath dataset (generated)', () => {
  it('exposes all three difficulties with a flagship pool', () => {
    for (const d of DIFFICULTIES) {
      expect(puzzleDataset[d].length, `${d} count`).toBeGreaterThanOrEqual(900)
    }
  })

  it('every puzzle is structurally valid and consistent with its pattern', () => {
    for (const d of DIFFICULTIES) {
      const ids = new Set<string>()
      for (const p of puzzleDataset[d]) {
        expect(p.id, 'id present').toBeTruthy()
        expect(ids.has(p.id), `unique id ${p.id}`).toBe(false)
        ids.add(p.id)

        const pattern = getPatternById(p.patternId ?? -1)
        expect(pattern, `pattern ${p.patternId} exists`).toBeTruthy()
        if (!pattern) continue

        expect(p.rows, 'rows').toBe(pattern.grid_rows)
        expect(p.columns, 'cols').toBe(pattern.grid_cols)
        expect(p.grid.length, 'grid rows').toBe(pattern.grid_rows)
        expect(p.grid[0].length, 'grid cols').toBe(pattern.grid_cols)

        const blankKeys = new Set<string>()
        for (let r = 0; r < p.rows; r++) {
          for (let c = 0; c < p.columns; c++) {
            const cell = p.grid[r][c]
            const key = `${r}-${c}`
            if (cell.type === 'empty' && cell.isEditable) {
              blankKeys.add(key)
              expect(p.solution[key], `blank ${key} has a solution value`).toBeTypeOf('number')
            }
          }
        }

        // Every pattern NUMBER cell must have a solution value.
        const resultKeys = new Set<string>()
        for (const eq of pattern.equations) {
          const last = eq.cells[eq.cells.length - 1]
          resultKeys.add(`${last[0]}-${last[1]}`)
        }
        for (const pc of pattern.cells) {
          if (pc.type === 'NUMBER') {
            const key = `${pc.row}-${pc.col}`
            expect(p.solution[key], `solution covers ${key}`).toBeTypeOf('number')
          }
        }

        // Result cells must be non-editable numbers.
        for (const key of resultKeys) {
          const [r, c] = key.split('-').map(Number)
          const cell = p.grid[r][c]
          expect(cell.isEditable, `${key} result non-editable`).toBe(false)
          expect(cell.type, `${key} result is number`).toBe('number')
        }

        // availableNumbers must equal distinct solution values of blanks.
        const expectedAvail = Array.from(blankKeys)
          .map((k) => p.solution[k])
          .filter((v): v is number => typeof v === 'number')
        const uniq = Array.from(new Set(expectedAvail)).sort((a, b) => a - b)
        expect([...p.availableNumbers].sort((a, b) => a - b)).toEqual(uniq)
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
    expect(getPuzzleById('definitely-not-a-real-id')).toBeUndefined()
  })
})
