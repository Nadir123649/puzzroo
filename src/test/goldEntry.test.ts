import { describe, expect, it } from 'vitest'
import easyGold from '../../shared/src/data/nonogram/easy-gold.json'
import { sanityCheckNonogram } from '../../shared/src/data/nonogram'
import type { Difficulty } from '../../shared/src/lib/nonogram/types'

interface RawRecord {
  id: string
  title: string
  difficulty: Difficulty
  size: number
  category: string
  estimatedTime: number
  sol: string
  rowClues: number[][]
  columnClues: number[][]
}

function decode(raw: RawRecord) {
  const size = raw.size
  const solution: number[][] = []
  for (let r = 0; r < size; r++) {
    const row: number[] = []
    for (let c = 0; c < size; c++) row.push(Number(raw.sol[r * size + c]))
    solution.push(row)
  }
  return {
    id: raw.id,
    title: raw.title,
    difficulty: raw.difficulty,
    size: size as Difficulty,
    category: raw.category,
    estimatedTime: raw.estimatedTime,
    solution,
    rowClues: raw.rowClues.map((values) => ({ values })),
    columnClues: raw.columnClues.map((values) => ({ values })),
  }
}

describe('easy-gold.json consumption', () => {
  it('every gold puzzle passes the app sanity check', () => {
    const records = easyGold as unknown as RawRecord[]
    expect(records.length).toBe(50)
    for (const rec of records) {
      const errors = sanityCheckNonogram(decode(rec))
      expect(errors, `${rec.id}: ${errors.join('; ')}`).toEqual([])
    }
  })

  it('no duplicate titles or ids', () => {
    const records = easyGold as unknown as RawRecord[]
    expect(new Set(records.map((r) => r.id)).size).toBe(50)
    expect(new Set(records.map((r) => r.title)).size).toBe(50)
  })
})