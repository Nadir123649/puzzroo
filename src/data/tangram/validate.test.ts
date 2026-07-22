/**
 * Tangram dataset validation tests
 * Mirrors sudoku/nonogram validate.test.ts. Asserts every generated puzzle is
 * a valid exact tiling of the 7 canonical pieces.
 */

import { describe, it, expect } from 'vitest'
import { POLYGON_DATASETS } from '@shared/data/tangram/polygon-datasets'
import { validateAll, validatePuzzle } from '@shared/data/tangram/tangramValidation'
import type { PolygonPuzzle } from '@shared/types/tangram-polygon'

describe('tangram polygon dataset', () => {
  it('contains the flagship volume (40 easy / 40 medium / 40 hard)', () => {
    const easy = POLYGON_DATASETS.filter((p) => p.difficulty === 'easy').length
    const medium = POLYGON_DATASETS.filter((p) => p.difficulty === 'medium').length
    const hard = POLYGON_DATASETS.filter((p) => p.difficulty === 'hard').length
    expect(easy).toBe(40)
    expect(medium).toBe(40)
    expect(hard).toBe(40)
    expect(POLYGON_DATASETS.length).toBe(120)
  })

  it('has unique ids', () => {
    const ids = POLYGON_DATASETS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every puzzle is a valid exact tiling of the 7 pieces', () => {
    const report = validateAll(POLYGON_DATASETS)
    const failed = report.results.filter((r) => !r.valid)
    if (failed.length > 0) {
      // surface the failures for debugging
      for (const f of failed.slice(0, 10)) {
        // eslint-disable-next-line no-console
        console.error(`INVALID ${f.id}:`, f.errors)
      }
    }
    expect(report.invalid, `${report.invalid} puzzles failed validation`).toBe(0)
    expect(report.valid).toBe(120)
  })

  it('rejects a puzzle whose vertices drift off the 5-unit grid', () => {
    const sample = JSON.parse(JSON.stringify(POLYGON_DATASETS[0])) as PolygonPuzzle
    // nudge one outline vertex by 1px -> the tiling no longer matches the outline
    sample.fullPolygon[0] = [sample.fullPolygon[0][0] + 1, sample.fullPolygon[0][1]]
    const result = validatePuzzle(sample)
    expect(result.valid).toBe(false)
    // a drifted vertex breaks the exact-tiling invariant -> at least one error
    expect(result.errors.length).toBeGreaterThan(0)
  })
})
