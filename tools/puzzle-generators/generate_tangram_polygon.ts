/**
 * Tangram Polygon Dataset Generator (constructive assembly)
 *
 * Produces mathematically guaranteed-valid Tangram puzzles by building the 7
 * canonical pieces through exact edge-matched attachment on the tangram
 * triangular lattice. Because every join shares a full edge, the resulting
 * cluster is always a gapless, non-overlapping tiling of a closed silhouette.
 *
 * Output:
 *   - shared/src/data/tangram/polygon-datasets.ts  (canonical, live source)
 *   - src/data/tangram/polygon-datasets.ts        (kept in sync)
 *   - public/data/tangram_easy.json / _medium / _hard / tangram_dataset.json
 *
 * Run: npx tsx tools/puzzle-generators/generate_tangram_polygon.ts
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { validatePuzzle } from '@shared/data/tangram/tangramValidation'

const __dirname = dirname(fileURLToPath(import.meta.url))

export let lastFailReason = ''
export let lastCand = -1
const ROOT = resolve(__dirname, '..', '..')

const SQRT2 = Math.SQRT2
const UNIT = 5 // small-triangle leg in output units (matches existing dataset)
const EPS = 1e-7
const QUANT = 1e-6

type Pt = [number, number]
type Poly = Pt[]

// ---- canonical piece shapes (unit coords: small-triangle leg = 1) ----
const CANON: Record<string, Poly> = {
  large: [[0, 0], [2, 0], [0, 2]],
  medium: [[0, 0], [SQRT2, 0], [0, SQRT2]],
  small: [[0, 0], [1, 0], [0, 1]],
  square: [[0, 0], [1, 0], [1, 1], [0, 1]],
  parallelogram: [[0, 0], [1, 0], [2, 1], [1, 1]],
}

// TangramPieceId order used for emit
const PIECE_ORDER: { id: string; base: keyof typeof CANON }[] = [
  { id: 'baseTriangle1', base: 'large' },
  { id: 'baseTriangle2', base: 'large' },
  { id: 'mediumTriangle', base: 'medium' },
  { id: 'smallTriangle1', base: 'small' },
  { id: 'smallTriangle2', base: 'small' },
  { id: 'square', base: 'square' },
  { id: 'parallelogram', base: 'parallelogram' },
]

// ---------------- geometry helpers ----------------
function signedArea(p: Poly): number {
  let a = 0
  for (let i = 0; i < p.length; i++) {
    const [x1, y1] = p[i]
    const [x2, y2] = p[(i + 1) % p.length]
    a += x1 * y2 - x2 * y1
  }
  return a / 2
}

function ccw(p: Poly): Poly {
  return signedArea(p) < 0 ? [...p].reverse() : p
}

function rotPt(p: Pt, ang: number): Pt {
  const c = Math.cos(ang)
  const s = Math.sin(ang)
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c]
}

function edgeLen(a: Pt, b: Pt): number {
  return Math.hypot(b[0] - a[0], b[1] - a[1])
}

function sub(a: Pt, b: Pt): Pt {
  return [a[0] - b[0], a[1] - b[1]]
}

function add(a: Pt, b: Pt): Pt {
  return [a[0] + b[0], a[1] + b[1]]
}

// rotate a point around origin by k*45 degrees
function rotK(p: Pt, k: number): Pt {
  return rotPt(p, (k * Math.PI) / 4)
}

// place canonical poly R so that edge (C,D) maps onto (A,B)
function placeEdge(R: Poly, C: Pt, D: Pt, A: Pt, B: Pt, reverse: boolean): Poly {
  const targetA = reverse ? B : A
  const targetB = reverse ? A : B
  const vec = sub(D, C)
  const tgt = sub(targetB, targetA)
  const ang = Math.atan2(tgt[1], tgt[0]) - Math.atan2(vec[1], vec[0])
  return R.map((v) => add(rotPt(sub(v, C), ang), targetA))
}

function pointInPolygonStrict(pt: Pt, poly: Poly): boolean {
  const [x, y] = pt
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    // on boundary -> not strictly inside
    const cross = (xj - xi) * (y - yi) - (yj - yi) * (x - xi)
    const dot = (x - xi) * (xj - xi) + (y - yi) * (yj - yi)
    const segLen2 = (xj - xi) ** 2 + (yj - yi) ** 2
    if (Math.abs(cross) < 1e-12 && dot >= 0 && dot <= segLen2) return false
    if (yi > y !== yj > y) {
      const xInt = ((xj - xi) * (y - yi)) / (yj - yi) + xi
      if (x < xInt) inside = !inside
    }
  }
  return inside
}

function orient(a: Pt, b: Pt, c: Pt): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
}

function segProperIntersect(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const o1 = orient(a, b, c)
  const o2 = orient(a, b, d)
  const o3 = orient(c, d, a)
  const o4 = orient(c, d, b)
  if (((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) && ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0)))
    return true
  return false
}

function centroid(poly: Poly): Pt {
  let x = 0
  let y = 0
  for (const p of poly) {
    x += p[0]
    y += p[1]
  }
  return [x / poly.length, y / poly.length]
}

function polygonsOverlap(p: Poly, q: Poly): boolean {
  // strict vertex-in-polygon
  for (const v of p) if (pointInPolygonStrict(v, q)) return true
  for (const v of q) if (pointInPolygonStrict(v, p)) return true
  // centroid poke (catches collinear overlaps)
  const cp = centroid(p)
  const cq = centroid(q)
  if (pointInPolygonStrict(cp, q) || pointInPolygonStrict(cq, p)) return true
  // proper edge crossings
  for (let i = 0; i < p.length; i++) {
    const a = p[i]
    const b = p[(i + 1) % p.length]
    for (let j = 0; j < q.length; j++) {
      const c = q[j]
      const d = q[(j + 1) % q.length]
      // skip shared endpoint (adjacent along a touching edge)
      if ((Math.abs(a[0] - c[0]) < EPS && Math.abs(a[1] - c[1]) < EPS) ||
          (Math.abs(a[0] - d[0]) < EPS && Math.abs(a[1] - d[1]) < EPS) ||
          (Math.abs(b[0] - c[0]) < EPS && Math.abs(b[1] - c[1]) < EPS) ||
          (Math.abs(b[0] - d[0]) < EPS && Math.abs(b[1] - d[1]) < EPS))
        continue
      if (segProperIntersect(a, b, c, d)) return true
    }
  }
  return false
}

// ---------------- boundary / outline ----------------
function qkey(p: Pt): string {
  return `${Math.round(p[0] / QUANT)},${Math.round(p[1] / QUANT)}`
}

interface DirEdge {
  a: Pt
  b: Pt
}

function allEdges(cluster: Poly[]): DirEdge[] {
  const edges: DirEdge[] = []
  for (const poly of cluster) {
    for (let i = 0; i < poly.length; i++) {
      edges.push({ a: poly[i], b: poly[(i + 1) % poly.length] })
    }
  }
  return edges
}

export function boundaryEdges(cluster: Poly[]): DirEdge[] {
  const edges = allEdges(cluster)
  const seen = new Set<string>()
  const rev = new Set<string>()
  for (const e of edges) {
    seen.add(`${qkey(e.a)}|${qkey(e.b)}`)
    rev.add(`${qkey(e.b)}|${qkey(e.a)}`)
  }
  return edges.filter((e) => !rev.has(`${qkey(e.a)}|${qkey(e.b)}`))
}

export function chainOutline(edges: DirEdge[]): Poly | null {
  if (edges.length === 0) return null
  const out = new Map<string, DirEdge[]>()
  for (const e of edges) {
    const k = qkey(e.a)
    if (!out.has(k)) out.set(k, [])
    out.get(k)!.push(e)
  }
  const norm = (p: Pt): Pt => {
    const l = Math.hypot(p[0], p[1]) || 1
    return [p[0] / l, p[1] / l]
  }
  let e = edges[0]
  const loop: Pt[] = [e.a]
  const visited = new Set<string>()
  visited.add(`${qkey(e.a)}|${qkey(e.b)}`)
  let guard = 0
  while (guard++ < edges.length * 4 + 10) {
    const b = e.b
    const r = norm(sub(e.a, e.b)) // reversed travel direction
    const cands = (out.get(qkey(b)) || []).filter(
      (c) => !(qkey(c.a) === qkey(b) && qkey(c.b) === qkey(e.a))
    )
    if (cands.length === 0) return null
    // pick the outgoing edge that is the most clockwise turn from r
    let best: DirEdge | null = null
    let bestCross = Infinity
    for (const c of cands) {
      const d = norm(sub(c.b, c.a))
      const cr = r[0] * d[1] - r[1] * d[0]
      if (cr < bestCross - 1e-9 || (Math.abs(cr - bestCross) <= 1e-9 && best === null)) {
        best = c
        bestCross = cr
      }
    }
    if (!best) return null
    const ek = `${qkey(best.a)}|${qkey(best.b)}`
    if (visited.has(ek)) return null
    visited.add(ek)
    loop.push(b)
    if (qkey(best.b) === qkey(edges[0].a) && loop.length > 2) {
      e = best
      break
    }
    e = best
  }
  if (qkey(e.b) !== qkey(edges[0].a)) return null
  if (loop.length < 3) return null
  if (visited.size !== edges.length) return null
  // reject self-touching outlines (figure-8 pinched to a point)
  const uniq = new Set(loop.map((p) => qkey(p)))
  if (uniq.size !== loop.length) return null
  return loop
}

export function selfIntersects(poly: Poly): boolean {
  let P = poly
  if (
    poly.length > 1 &&
    Math.abs(poly[0][0] - poly[poly.length - 1][0]) < 1e-6 &&
    Math.abs(poly[0][1] - poly[poly.length - 1][1]) < 1e-6
  ) {
    P = poly.slice(0, poly.length - 1)
  }
  const n = P.length
  const orient = (a: Pt, b: Pt, c: Pt) =>
    (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
  const same = (p: Pt, q: Pt) => qkey(p) === qkey(q)
  for (let i = 0; i < n; i++) {
    const a = P[i]
    const b = P[(i + 1) % n]
    for (let j = i + 1; j < n; j++) {
      const c = P[j]
      const d = P[(j + 1) % n]
      const adjacent = i === j || (i + 1) % n === j || (j + 1) % n === i
      if (!adjacent) {
        // non-adjacent edges sharing an endpoint => self-touch
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

// ---------------- symmetry scoring ----------------
function polyToVertexSet(poly: Poly): Set<string> {
  return new Set(poly.map((p) => qkey(p)))
}

function center(poly: Poly): Pt {
  let x = 0
  let y = 0
  for (const p of poly) {
    x += p[0]
    y += p[1]
  }
  return [x / poly.length, y / poly.length]
}

function transformPoly(poly: Poly, fn: (p: Pt) => Pt): Poly {
  return poly.map(fn)
}

function symmetryCount(poly: Poly): number {
  const c = center(poly)
  const rel = poly.map((p) => [p[0] - c[0], p[1] - c[1]] as Pt)
  const base = polyToVertexSet(rel)
  const tests: ((p: Pt) => Pt)[] = [
    (p) => [-p[0], p[1]], // vertical mirror
    (p) => [p[0], -p[1]], // horizontal mirror
    (p) => [p[1], p[0]], // diag y=x
    (p) => [-p[1], -p[0]], // diag y=-x
    (p) => [-p[0], -p[1]], // 180 rotation
  ]
  let n = 0
  for (const t of tests) {
    const s = polyToVertexSet(transformPoly(rel, t))
    if (s.size === base.size) {
      let all = true
      for (const k of base) if (!s.has(k)) { all = false; break }
      if (all) n++
    }
  }
  return n
}

// ---------------- assembly ----------------
function instantiate(base: keyof typeof CANON, rot: number): Poly {
  return ccw(CANON[base].map((v) => rotK(v, rot)))
}

interface Placed {
  id: string
  poly: Poly
}

export function buildOne(seedIdx: number, rng: () => number): { pieces: Placed[]; outline: Poly } | null {
  const pool = PIECE_ORDER.map((p) => ({ ...p }))
  // shuffle remaining
  const remaining = pool.slice()
  // remove seed
  const seed = remaining.splice(seedIdx % remaining.length, 1)[0]
  const seedRot = Math.floor(rng() * 8)
  const pieces: Placed[] = [{ id: seed.id, poly: instantiate(seed.base, seedRot) }]

  let guard = 0
  while (remaining.length > 0 && guard++ < 50) {
    const bnd = boundaryEdges(pieces.map((p) => p.poly))
    const cands: { ridx: number; poly: Poly }[] = []
    const seenPlace: Set<string> = new Set()
    for (const e of bnd) {
      const L = edgeLen(e.a, e.b)
      for (let ri = 0; ri < remaining.length; ri++) {
        const R = CANON[remaining[ri].base]
        for (let ei = 0; ei < R.length; ei++) {
          const C = R[ei]
          const D = R[(ei + 1) % R.length]
          if (Math.abs(edgeLen(C, D) - L) > EPS) continue
          for (const rev of [false, true]) {
            const Q = placeEdge(R, C, D, e.a, e.b, rev)
            const ph = Q.map((v) => qkey(v)).sort().join('|')
            if (seenPlace.has(ph)) continue
            seenPlace.add(ph)
            let overlap = false
            for (const ex of pieces) {
              if (polygonsOverlap(Q, ex.poly)) {
                overlap = true
                break
              }
            }
            if (!overlap) cands.push({ ridx: ri, poly: Q })
          }
        }
      }
    }
    if (cands.length === 0) {
      lastFailReason = 'no-cands step=' + guard
      return null
    }
    lastCand = cands.length
    const pick = cands[Math.floor(rng() * cands.length)]
    const chosen = remaining.splice(pick.ridx, 1)[0]
    pieces.push({ id: chosen.id, poly: pick.poly })
  }
  if (remaining.length > 0) {
    lastFailReason = 'remaining=' + remaining.length
    return null
  }

  const bnd = boundaryEdges(pieces.map((p) => p.poly))
  const outline = chainOutline(bnd)
  if (!outline) {
    lastFailReason = 'chainOutline-null'
    return null
  }
  return { pieces, outline }
}

// normalize cluster to translation+rotation-invariant signature
function signature(pieces: Placed[], outline: Poly): string {
  // translate so min corner = 0
  let minX = Infinity
  let minY = Infinity
  for (const p of [...pieces.map((x) => x.poly).flat(), ...outline]) {
    minX = Math.min(minX, p[0])
    minY = Math.min(minY, p[1])
  }
  const shift = (poly: Poly): Poly => poly.map(([x, y]) => [x - minX, y - minY] as Pt)
  const sp = pieces.map((x) => ({ id: x.id, poly: shift(x.poly) }))
  const so = shift(outline)
  // try 8 rotations, take canonical (sorted vertex-string) minimal
  const allVerts = (): string[] => {
    const arr: string[] = []
    for (const p of sp) for (const v of p.poly) arr.push(qkey(v))
    for (const v of so) arr.push(qkey(v))
    return arr.sort()
  }
  let best = ''
  for (let k = 0; k < 8; k++) {
    const rot = (poly: Poly): Poly => poly.map((v) => rotK(v, k))
    const rp = sp.map((x) => ({ id: x.id, poly: rot(x.poly) }))
    const ro = rot(so)
    const arr: string[] = []
    for (const p of rp) for (const v of p.poly) arr.push(qkey(v))
    for (const v of ro) arr.push(qkey(v))
    const s = arr.sort().join('|')
    if (best === '' || s < best) best = s
  }
  // include piece id multiset
  const ids = sp.map((p) => p.id).sort().join(',')
  return createHash('sha1').update(best + '#' + ids).digest('hex')
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface PuzzleResult {
  pieces: Placed[]
  outline: Poly
  sig: string
  sym: number
  rotDiv: number
}

export function generatePool(target: number): PuzzleResult[] {
  const seen = new Set<string>()
  const results: PuzzleResult[] = []
  let seed = 1234567
  let attempts = 0
  while (results.length < target && attempts < 800000) {
    attempts++
    if (attempts % 25000 === 0) {
      console.log(`  progress: ${results.length}/${target} unique (attempts ${attempts})`)
    }
    const rng = mulberry32(seed++)
    const seedIdx = Math.floor(rng() * 7)
    const built = buildOne(seedIdx, rng)
    if (!built) continue
    const sig = signature(built.pieces, built.outline)
    if (seen.has(sig)) continue
    // basic sanity: outline must have area and >=3 verts
    if (built.outline.length < 3) continue
    if (Math.abs(signedArea(built.outline)) < 1e-3) continue
    if (selfIntersects(built.outline)) continue
    // Validate the FINAL emitted geometry (scaled + rounded) so the dataset
    // passes the external validator regardless of rounding effects.
    const closeP = (poly: number[][]): number[][] => [...poly, poly[0]]
    const emitPuzzle = {
      id: 'tmp',
      sourceId: 'tmp',
      active: true,
      difficulty: 'easy' as const,
      gameType: 'tangram' as const,
      pieceShapeIds: built.pieces.map((p) => p.id),
      individualPiecePolygons: built.pieces.map((p) => closeP(scalePoly(p.poly))),
      fullPolygon: closeP(scalePoly(built.outline)),
    }
    if (!validatePuzzle(emitPuzzle as any).valid) continue
    const sym = symmetryCount(built.outline)
    // rotation diversity: count distinct first-edge directions
    const dirs = new Set<string>()
    for (const p of built.pieces) {
      const d = sub(p.poly[1], p.poly[0])
      const ang = Math.round(Math.atan2(d[1], d[0]) / (Math.PI / 4)) % 8
      dirs.add(((ang % 8) + 8) % 8 + '')
    }
    const rotDiv = dirs.size
    seen.add(sig)
    results.push({ pieces: built.pieces, outline: built.outline, sig, sym, rotDiv })
  }
  return results
}

// ---------------- emit ----------------
function round3(v: number): number {
  if (Math.abs(v) < 1e-9) return 0
  return Number(v.toFixed(3))
}

function scalePoly(poly: Poly): number[][] {
  // high precision (10 dp) to avoid rounding-induced self-intersections
  return poly.map(([x, y]) => [Number((x * UNIT).toFixed(10)), Number((y * UNIT).toFixed(10))])
}

function fmtPoly(poly: number[][]): string {
  const pts = poly.map(([x, y]) => `[${x},${y}]`).join(',')
  return `[${pts}]`
}

function emitPuzzle(r: PuzzleResult, difficulty: string, idx: number): string {
  const id = 'tng_' + r.sig.slice(0, 22)
  const sourceId = r.sig.slice(0, 8) + '-' + r.sig.slice(8, 12) + '-' + r.sig.slice(12, 16) + '-' + r.sig.slice(16, 20) + '-' + r.sig.slice(20, 32)
  const pieceShapeIds = r.pieces.map((p) => p.id)
  const individual = r.pieces.map((p) => scalePoly(p.poly))
  const outline = scalePoly(r.outline)
  // close outline & pieces by repeating first vertex
  const close = (poly: number[][]): number[][] => [...poly, poly[0]]
  const indStr = individual.map((p) => '      ' + fmtPoly(close(p))).join(',\n')
  const outStr = '      ' + fmtPoly(close(outline))
  return `  {
    id: '${id}',
    sourceId: '${sourceId}',
    active: true,
    difficulty: '${difficulty}',
    gameType: 'tangram',
    pieceShapeIds: [
      ${pieceShapeIds.map((s) => `'${s}'`).join(',\n      ')}
    ],
    individualPiecePolygons: [
${indStr}
    ],
    fullPolygon: ${outStr}
  }`
}

function main() {
  const TARGET_PER = 40
  const POOL_TARGET = TARGET_PER * 3 // exactly 120 unique; bucketing reuses pool
  console.log(`Generating tangram pool (target ~${POOL_TARGET})...`)
  const pool = generatePool(POOL_TARGET)
  console.log(`Pool generated: ${pool.length} unique valid puzzles`)

  // score & bucket: regularity high = easy
  const scored = pool.map((p) => ({ ...p, reg: p.sym * 3 + (8 - p.rotDiv) }))
  scored.sort((a, b) => b.reg - a.reg) // easiest first

  const easy = scored.slice(0, TARGET_PER)
  const medium = scored.slice(TARGET_PER, scored.length - TARGET_PER)
  const hard = scored.slice(scored.length - TARGET_PER)

  // Build combined dataset: all difficulties in one file (matches current structure)
  const combined = [...easy, ...medium, ...hard]
  const header = `/**
 * Canonical Polygon-Based Tangram Datasets (GENERATED)
 * Generated by tools/puzzle-generators/generate_tangram_polygon.ts
 * Each puzzle is a mathematically valid, edge-matched tiling of the 7
 * canonical tangram pieces (${combined.length} puzzles: ${easy.length} easy, ${medium.length} medium, ${hard.length} hard).
 * DO NOT EDIT BY HAND - regenerate via the generator.
 */

import { PolygonPuzzle } from '@shared/types/tangram-polygon'

export const POLYGON_DATASETS: PolygonPuzzle[] = [
`
  const body = combined
    .map((r, i) =>
      emitPuzzle(r, easy.includes(r) ? 'easy' : medium.includes(r) ? 'medium' : 'hard', i)
    )
    .join(',\n')
  const footer = '\n]\n'

  const sharedTs = resolve(ROOT, 'shared', 'src', 'data', 'tangram', 'polygon-datasets.ts')
  const srcTs = resolve(ROOT, 'src', 'data', 'tangram', 'polygon-datasets.ts')
  writeFileSync(sharedTs, header + body + footer, 'utf8')
  // sync src mirror
  writeFileSync(
    srcTs,
    header.replace('@shared/types/tangram-polygon', '@/types/tangram-polygon') + body + footer,
    'utf8'
  )
  console.log(`Wrote combined dataset: ${combined.length} puzzles`)
  console.log(`  shared: ${sharedTs}`)
  console.log(`  src:    ${srcTs}`)

  // ---- JSON exports ----
  const dataDir = resolve(ROOT, 'public', 'data')
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })
  function toJson(arr: PuzzleResult[], difficulty: string) {
    return {
      version: '2.0.0',
      generated: new Date().toISOString().slice(0, 10),
      difficulty,
      count: arr.length,
      puzzles: arr.map((r) => ({
        id: 'tng_' + r.sig.slice(0, 22),
        sourceId: r.sig,
        difficulty,
        gameType: 'tangram',
        active: true,
        pieceShapeIds: r.pieces.map((p) => p.id),
        individualPiecePolygons: r.pieces.map((p) => closePoly(scalePoly(p.poly))),
        fullPolygon: closePoly(scalePoly(r.outline)),
      })),
    }
  }
  function closePoly(poly: number[][]): number[][] {
    return [...poly, poly[0]]
  }
  const easyJ = toJson(easy, 'easy')
  const medJ = toJson(medium, 'medium')
  const hardJ = toJson(hard, 'hard')
  writeFileSync(resolve(dataDir, 'tangram_easy.json'), JSON.stringify(easyJ, null, 2))
  writeFileSync(resolve(dataDir, 'tangram_medium.json'), JSON.stringify(medJ, null, 2))
  writeFileSync(resolve(dataDir, 'tangram_hard.json'), JSON.stringify(hardJ, null, 2))
  writeFileSync(
    resolve(dataDir, 'tangram_dataset.json'),
    JSON.stringify(
      {
        version: '2.0.0',
        generated: new Date().toISOString().slice(0, 10),
        difficulties: { easy: easyJ, medium: medJ, hard: hardJ },
      },
      null,
      2
    )
  )
  console.log('Wrote JSON exports to public/data/')
  console.log('\nDONE.')
}

const isMain =
  process.argv[1] && process.argv[1].endsWith('generate_tangram_polygon.ts')
if (isMain) main()
