/**
 * Tangram polygon dataset validation
 * Independent, geometry-based checks that every puzzle is a valid exact
 * tiling of the 7 canonical pieces. No external deps.
 *
 * Core invariant: the boundary edges of the 7 pieces (in dataset coordinates)
 * must equal the fullPolygon outline edges, AND the sum of piece areas must
 * equal the outline area. Together these prove gapless, non-overlapping,
 * exact coverage of the silhouette.
 */

import type { PolygonPuzzle, TangramPieceId } from '@shared/types/tangram-polygon'

const SQRT2 = Math.SQRT2
const TOL = 0.05

type Pt = [number, number]
type Poly = number[][]

interface PieceSpec {
  area: number
  edges: number[] // expected edge-length multiset (output units)
}

const SPECS: Record<TangramPieceId, PieceSpec> = {
  baseTriangle1: { area: 50, edges: [10, 10, 10 * SQRT2] },
  baseTriangle2: { area: 50, edges: [10, 10, 10 * SQRT2] },
  mediumTriangle: { area: 25, edges: [5 * SQRT2, 5 * SQRT2, 10] },
  smallTriangle1: { area: 12.5, edges: [5, 5, 5 * SQRT2] },
  smallTriangle2: { area: 12.5, edges: [5, 5, 5 * SQRT2] },
  square: { area: 25, edges: [5, 5, 5, 5] },
  parallelogram: { area: 25, edges: [5, 5, 5 * SQRT2, 5 * SQRT2] },
}

const EXPECTED_IDS: TangramPieceId[] = [
  'baseTriangle1',
  'baseTriangle2',
  'mediumTriangle',
  'smallTriangle1',
  'smallTriangle2',
  'square',
  'parallelogram',
]

export interface PuzzleCheck {
  id: string
  valid: boolean
  errors: string[]
}

function signedArea(poly: Poly): number {
  let a = 0
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i]
    const [x2, y2] = poly[(i + 1) % poly.length]
    a += x1 * y2 - x2 * y1
  }
  return a / 2
}

function edgeLen(a: Pt, b: Pt): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1])
}

function qkey(p: number[]): string {
  return `${Math.round(p[0] * 1000)},${Math.round(p[1] * 1000)}`
}

function directedEdges(poly: Poly): [string, string][] {
  const edges: [string, string][] = []
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    if (Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9) continue
    edges.push([qkey(a), qkey(b)])
  }
  return edges
}

function edgeSet(poly: Poly): Set<string> {
  const s = new Set<string>()
  for (const [a, b] of directedEdges(poly)) s.add(`${a}|${b}`)
  return s
}

function multisetMatch(actual: number[], expected: number[]): boolean {
  if (actual.length !== expected.length) return false
  const a = [...actual].sort((x, y) => x - y)
  const e = [...expected].sort((x, y) => x - y)
  return a.every((v, i) => Math.abs(v - e[i]) <= TOL)
}

function orient(a: number[], b: number[], c: number[]): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
}

function selfIntersects(poly: Poly): boolean {
  // strip a trailing closing vertex so its duplicate doesn't false-trigger
  // the shared-endpoint self-touch check
  let P = poly
  if (
    poly.length > 1 &&
    Math.abs(poly[0][0] - poly[poly.length - 1][0]) < 1e-6 &&
    Math.abs(poly[0][1] - poly[poly.length - 1][1]) < 1e-6
  ) {
    P = poly.slice(0, poly.length - 1)
  }
  const n = P.length
  const same = (p: number[], q: number[]) =>
    Math.abs(p[0] - q[0]) < 1e-9 && Math.abs(p[1] - q[1]) < 1e-9
  for (let i = 0; i < n; i++) {
    const a = P[i]
    const b = P[(i + 1) % n]
    for (let j = i + 1; j < n; j++) {
      const c = P[j]
      const d = P[(j + 1) % n]
      const adjacent = i === j || (i + 1) % n === j || (j + 1) % n === i
      if (!adjacent) {
        if (same(a, c) || same(a, d) || same(b, c) || same(b, d)) return true
      }
      if (adjacent) continue
      const o1 = orient(a, b, c)
      const o2 = orient(a, b, d)
      const o3 = orient(c, d, a)
      const o4 = orient(c, d, b)
      if (((o1 > 0) !== (o2 > 0)) && ((o3 > 0) !== (o4 > 0))) return true
    }
  }
  return false
}

export function validatePuzzle(puzzle: PolygonPuzzle): PuzzleCheck {
  const errors: string[] = []
  const id = puzzle.id || '(no-id)'

  if (puzzle.pieceShapeIds.length !== 7) {
    errors.push(`expected 7 pieceShapeIds, got ${puzzle.pieceShapeIds.length}`)
  }
  const idMultiset = [...puzzle.pieceShapeIds].sort().join(',')
  const expMultiset = [...EXPECTED_IDS].sort().join(',')
  if (idMultiset !== expMultiset) {
    errors.push(`piece id multiset mismatch: have [${idMultiset}]`)
  }

  if (puzzle.individualPiecePolygons.length !== 7) {
    errors.push(`expected 7 individualPiecePolygons, got ${puzzle.individualPiecePolygons.length}`)
  }

  // per-piece geometry
  let sumArea = 0
  puzzle.pieceShapeIds.forEach((pid, i) => {
    const poly = puzzle.individualPiecePolygons[i]
    if (!poly || poly.length < 3) {
      errors.push(`piece ${pid} has <3 vertices`)
      return
    }
    const spec = SPECS[pid as TangramPieceId]
    if (!spec) {
      errors.push(`unknown piece id ${pid}`)
      return
    }
    const area = Math.abs(signedArea(poly))
    if (Math.abs(area - spec.area) > TOL) {
      errors.push(`piece ${pid} area ${area.toFixed(2)} != ${spec.area}`)
    }
    const lens: number[] = []
    for (let k = 0; k < poly.length; k++) {
      const a = poly[k]
      const b = poly[(k + 1) % poly.length]
      if (Math.abs(a[0] - b[0]) < 1e-9 && Math.abs(a[1] - b[1]) < 1e-9) continue
      lens.push(edgeLen(a as Pt, b as Pt))
    }
    if (!multisetMatch(lens, spec.edges)) {
      errors.push(
        `piece ${pid} edge lengths [${lens.map((l) => l.toFixed(2)).join(',')}] != [${spec.edges
          .map((l) => l.toFixed(2))
          .join(',')}]`
      )
    }
    sumArea += area
  })

  // outline checks
  const outline = puzzle.fullPolygon
  if (!outline || outline.length < 3) {
    errors.push('fullPolygon missing or <3 vertices')
  } else {
    if (selfIntersects(outline)) {
      errors.push('fullPolygon self-intersects')
    }
    const outlineArea = Math.abs(signedArea(outline))
    if (Math.abs(sumArea - outlineArea) > TOL * 7) {
      errors.push(
        `sum of piece areas ${sumArea.toFixed(2)} != outline area ${outlineArea.toFixed(2)}`
      )
    }

    // boundary-of-pieces must equal outline edges
    const clusterEdges = new Set<string>()
    for (const poly of puzzle.individualPiecePolygons) {
      for (const e of edgeSet(poly)) clusterEdges.add(e)
    }
    const boundary = new Set<string>()
    for (const e of clusterEdges) {
      const [a, b] = e.split('|')
      if (!clusterEdges.has(`${b}|${a}`)) boundary.add(e)
    }
    const outlineEdgeSet = edgeSet(outline)
    if (boundary.size !== outlineEdgeSet.size) {
      errors.push(
        `piece boundary edge count ${boundary.size} != outline edge count ${outlineEdgeSet.size}`
      )
    } else {
      for (const e of outlineEdgeSet) {
        if (!boundary.has(e)) {
          errors.push('outline edge not present in piece boundary (gap/overlap)')
          break
        }
      }
    }
  }

  return { id, valid: errors.length === 0, errors }
}

export function validateAll(puzzles: PolygonPuzzle[]): {
  total: number
  valid: number
  invalid: number
  results: PuzzleCheck[]
} {
  const results = puzzles.map(validatePuzzle)
  const valid = results.filter((r) => r.valid).length
  return {
    total: results.length,
    valid,
    invalid: results.length - valid,
    results,
  }
}
