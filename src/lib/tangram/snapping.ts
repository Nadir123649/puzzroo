/**
 * Tangram Snapping Engine
 * 
 * Provides three layers of magnetic snapping (checked in priority order):
 *  1. Exact solution slot snap  (handled externally via SQUARE_SOLUTION)
 *  2. Piece-to-piece vertex/edge snapping
 *  3. Square-edge boundary snapping
 *
 * All coordinates are in the 750×493 virtual board space.
 */

import { UNIT, PIECE_CONFIG } from './pieceConfig'
import { TangramPiece } from '@/types/tangram'
import { BOARD_VIRTUAL_WIDTH, SILHOUETTE_HEIGHT } from './boardConfig'

// ── Square silhouette geometry (must match TangramBoard.tsx) ─────────────────
const SQUARE_SIZE = 200

export const SQUARE_LEFT   = BOARD_VIRTUAL_WIDTH / 2 - SQUARE_SIZE / 2
export const SQUARE_TOP    = (SILHOUETTE_HEIGHT / 2 - SQUARE_SIZE / 2) * 0.9
export const SQUARE_RIGHT  = SQUARE_LEFT + SQUARE_SIZE
export const SQUARE_BOTTOM = SQUARE_TOP + SQUARE_SIZE

// ── Thresholds ──────────────────────────────────────────────────────────────
const EDGE_SNAP_THRESHOLD     = 25   // px — snap piece edge to square boundary
const VERTEX_SNAP_THRESHOLD   = 18   // px — snap vertex-to-vertex between pieces
const EDGE_EDGE_SNAP_THRESHOLD = 15  // px — snap edge-to-edge between pieces

// ── Types ───────────────────────────────────────────────────────────────────
type Vec2 = [number, number]

interface SnapResult {
  x: number
  y: number
  snapped: boolean
}

// ── Vertex helpers ──────────────────────────────────────────────────────────

/**
 * Return the SVG-path vertices for a given piece type (before rotation).
 */
function getBaseVertices(type: string): Vec2[] {
  switch (type) {
    case 'large-triangle-1':
    case 'large-triangle-2':
      return [[0, 0], [UNIT * 2, 0], [0, UNIT * 2]]
    case 'medium-triangle':
      return [[0, 0], [UNIT * Math.SQRT2, 0], [0, UNIT * Math.SQRT2]]
    case 'small-triangle-1':
    case 'small-triangle-2':
      return [[0, 0], [UNIT, 0], [0, UNIT]]
    case 'square':
      return [[0, 0], [UNIT, 0], [UNIT, UNIT], [0, UNIT]]
    case 'parallelogram':
      return [[UNIT, 0], [UNIT * 2, 0], [UNIT, UNIT], [0, UNIT]]
    default:
      return []
  }
}

/**
 * Get bounding-box center for a piece type.
 */
function getCenter(type: string): Vec2 {
  const cfg = PIECE_CONFIG[type as keyof typeof PIECE_CONFIG]
  if (!cfg) return [0, 0]
  return [cfg.displayWidth / 2, cfg.displayHeight / 2]
}

/**
 * Compute world-space vertices for a piece at (x, y) with given rotation (deg).
 */
export function getWorldVertices(
  type: string,
  x: number,
  y: number,
  rotation: number
): Vec2[] {
  const base = getBaseVertices(type)
  const [cx, cy] = getCenter(type)
  const rad = (rotation * Math.PI) / 180

  return base.map(([vx, vy]) => {
    const dx = vx - cx
    const dy = vy - cy
    const rx = cx + dx * Math.cos(rad) - dy * Math.sin(rad)
    const ry = cy + dx * Math.sin(rad) + dy * Math.cos(rad)
    return [x + rx, y + ry] as Vec2
  })
}

/**
 * Build edge segments from ordered vertices.
 * Returns array of [start, end] pairs.
 */
function getEdges(verts: Vec2[]): [Vec2, Vec2][] {
  const edges: [Vec2, Vec2][] = []
  for (let i = 0; i < verts.length; i++) {
    edges.push([verts[i], verts[(i + 1) % verts.length]])
  }
  return edges
}

/**
 * Shortest distance from point P to the line segment AB.
 */
function distPointToSegment(p: Vec2, a: Vec2, b: Vec2): number {
  const abx = b[0] - a[0]
  const aby = b[1] - a[1]
  const apx = p[0] - a[0]
  const apy = p[1] - a[1]
  const ab2 = abx * abx + aby * aby
  if (ab2 === 0) return Math.hypot(apx, apy) // degenerate segment

  let t = (apx * abx + apy * aby) / ab2
  t = Math.max(0, Math.min(1, t))
  const closestX = a[0] + t * abx
  const closestY = a[1] + t * aby
  return Math.hypot(p[0] - closestX, p[1] - closestY)
}

/**
 * Shortest distance between two line segments (simplified: vertex-to-edge checks).
 * Returns the min distance and the delta [dx, dy] to move segment1 so the closest
 * point pair overlaps.
 */
function segmentSegmentSnap(
  a1: Vec2, a2: Vec2,
  b1: Vec2, b2: Vec2
): { dist: number; dx: number; dy: number } | null {
  // Check all vertex-to-segment combos and pick closest
  let best = Infinity
  let bestDx = 0
  let bestDy = 0

  const check = (p: Vec2, s1: Vec2, s2: Vec2, sign: number) => {
    const sx = s2[0] - s1[0]
    const sy = s2[1] - s1[1]
    const px = p[0] - s1[0]
    const py = p[1] - s1[1]
    const len2 = sx * sx + sy * sy
    if (len2 === 0) return

    let t = (px * sx + py * sy) / len2
    t = Math.max(0, Math.min(1, t))
    const cx = s1[0] + t * sx
    const cy = s1[1] + t * sy
    const d = Math.hypot(p[0] - cx, p[1] - cy)
    if (d < best) {
      best = d
      // move the dragging piece so p lands on (cx, cy)
      bestDx = sign * (cx - p[0])
      bestDy = sign * (cy - p[1])
    }
  }

  // Vertex of edge A onto edge B → move A towards B → sign = +1
  check(a1, b1, b2, 1)
  check(a2, b1, b2, 1)
  // Vertex of edge B onto edge A → move A towards B → sign = -1
  check(b1, a1, a2, -1)
  check(b2, a1, a2, -1)

  if (best < EDGE_EDGE_SNAP_THRESHOLD) {
    return { dist: best, dx: bestDx, dy: bestDy }
  }
  return null
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Try to snap the dragged piece to the nearest placed piece (vertex-to-vertex
 * or edge-to-edge). Returns adjusted (x, y) if a snap occurred.
 *
 * @param dragType   – piece type being dragged
 * @param dragX      – current drag x
 * @param dragY      – current drag y
 * @param dragRot    – current drag rotation
 * @param placedPieces – all other pieces that are already placed
 */
export function snapToPieces(
  dragType: string,
  dragX: number,
  dragY: number,
  dragRot: number,
  dragId: string,
  placedPieces: TangramPiece[]
): SnapResult {
  const dragVerts = getWorldVertices(dragType, dragX, dragY, dragRot)

  let bestDist = Infinity
  let bestDx = 0
  let bestDy = 0

  for (const other of placedPieces) {
    if (other.id === dragId) continue
    if (!other.isPlaced) continue

    const otherVerts = getWorldVertices(
      other.type,
      other.position.x,
      other.position.y,
      other.position.rotation
    )

    // 1) Vertex-to-vertex
    for (const dv of dragVerts) {
      for (const ov of otherVerts) {
        const d = Math.hypot(dv[0] - ov[0], dv[1] - ov[1])
        if (d < VERTEX_SNAP_THRESHOLD && d < bestDist) {
          bestDist = d
          bestDx = ov[0] - dv[0]
          bestDy = ov[1] - dv[1]
        }
      }
    }

    // 2) Edge-to-edge (vertex-to-segment)
    const dragEdges = getEdges(dragVerts)
    const otherEdges = getEdges(otherVerts)
    for (const [da, db] of dragEdges) {
      for (const [oa, ob] of otherEdges) {
        const snap = segmentSegmentSnap(da, db, oa, ob)
        if (snap && snap.dist < bestDist) {
          bestDist = snap.dist
          bestDx = snap.dx
          bestDy = snap.dy
        }
      }
    }
  }

  if (bestDist < VERTEX_SNAP_THRESHOLD) {
    return { x: dragX + bestDx, y: dragY + bestDy, snapped: true }
  }
  return { x: dragX, y: dragY, snapped: false }
}

/**
 * Try to snap the dragged piece to the square silhouette edges.
 * Checks if any of the piece's vertices are close to a square boundary,
 * and nudges the piece so the vertex touches exactly.
 *
 * @param dragType  – piece type being dragged
 * @param dragX     – current drag x
 * @param dragY     – current drag y
 * @param dragRot   – current drag rotation
 */
export function snapToSquareEdge(
  dragType: string,
  dragX: number,
  dragY: number,
  dragRot: number
): SnapResult {
  const verts = getWorldVertices(dragType, dragX, dragY, dragRot)

  let bestDist = Infinity
  let snapDx = 0
  let snapDy = 0

  for (const [vx, vy] of verts) {
    // Only snap if vertex is near the square area (within threshold of a boundary)
    // and the vertex is roughly within or near the square in the other axis

    // Left edge
    const dLeft = Math.abs(vx - SQUARE_LEFT)
    if (dLeft < EDGE_SNAP_THRESHOLD && vy >= SQUARE_TOP - 10 && vy <= SQUARE_BOTTOM + 10) {
      if (dLeft < bestDist) {
        bestDist = dLeft
        snapDx = SQUARE_LEFT - vx
        snapDy = 0
      }
    }

    // Right edge
    const dRight = Math.abs(vx - SQUARE_RIGHT)
    if (dRight < EDGE_SNAP_THRESHOLD && vy >= SQUARE_TOP - 10 && vy <= SQUARE_BOTTOM + 10) {
      if (dRight < bestDist) {
        bestDist = dRight
        snapDx = SQUARE_RIGHT - vx
        snapDy = 0
      }
    }

    // Top edge
    const dTop = Math.abs(vy - SQUARE_TOP)
    if (dTop < EDGE_SNAP_THRESHOLD && vx >= SQUARE_LEFT - 10 && vx <= SQUARE_RIGHT + 10) {
      if (dTop < bestDist) {
        bestDist = dTop
        snapDx = 0
        snapDy = SQUARE_TOP - vy
      }
    }

    // Bottom edge
    const dBottom = Math.abs(vy - SQUARE_BOTTOM)
    if (dBottom < EDGE_SNAP_THRESHOLD && vx >= SQUARE_LEFT - 10 && vx <= SQUARE_RIGHT + 10) {
      if (dBottom < bestDist) {
        bestDist = dBottom
        snapDx = 0
        snapDy = SQUARE_BOTTOM - vy
      }
    }
  }

  if (bestDist < EDGE_SNAP_THRESHOLD) {
    return { x: dragX + snapDx, y: dragY + snapDy, snapped: true }
  }
  return { x: dragX, y: dragY, snapped: false }
}
