/**
 * Tangram Square Solution
 * Canonical solved positions for the classic Tangram square puzzle
 * 
 * MATHEMATICALLY PROVEN solution for 200×200px square
 * All positions computed from exact geometry
 * 
 * The solution uses this decomposition of the 200x200 square:
 * - LT1: top triangle (0,0)-(200,0)-(100,100), right angle at center
 * - LT2: left triangle (0,0)-(0,200)-(100,100), right angle at center
 * - MT: top-right (200,0)-(200,100)-(100,100), right angle at (200,100)
 * - The remaining trapezoid is filled by SQ, PAR, ST1, ST2
 */

import { UNIT, PIECE_CONFIG, TARGET_SQUARE_SIZE } from './pieceConfig'
import { TangramPieceType } from '@/types/tangram'
import {
  BOARD_VIRTUAL_WIDTH,
  SILHOUETTE_HEIGHT,
} from './boardConfig'

/**
 * Calculate square center position on board
 */
const SQUARE_X = BOARD_VIRTUAL_WIDTH / 2 - TARGET_SQUARE_SIZE / 2
const SQUARE_Y = (SILHOUETTE_HEIGHT / 2 - TARGET_SQUARE_SIZE / 2) * 0.9

// Shorthand for solution offsets relative to the square position
const S = SQUARE_X
const T = SQUARE_Y

// Helper: compute piece position (px, py) given:
//   - target board vertex coords for each SVG vertex
//   - piece's displayWidth/height and rotation
// Formula: boardX = px + cx + (vx-cx)*cos(r) - (vy-cy)*sin(r)
//          boardY = py + cy + (vx-cx)*sin(r) + (vy-cy)*cos(r)

const s2 = Math.SQRT2 / 2 // ~0.7071

/**
 * CANONICAL TANGRAM SQUARE SOLUTION
 * 
 * Each piece position is the top-left corner of its bounding box
 * in the 750×493 virtual coordinate system.
 * 
 * The rotation is applied via CSS transform rotate() around the
 * center of the bounding box (displayWidth/2, displayHeight/2).
 */
export const SQUARE_SOLUTION: Record<TangramPieceType, { x: number; y: number; rotation: number }> = {
  'large-triangle-1': {
    x: S + 29.29,
    y: T - 70.71,
    rotation: 225,
  },
  'large-triangle-2': {
    x: S - 70.71,
    y: T + 29.29,
    rotation: 135,
  },
  'medium-triangle': {
    x: S + 100,
    y: T + 100,
    rotation: 180,
  },
  'small-triangle-1': {
    x: S + 14.64,
    y: T + 164.64,
    rotation: 45,
  },
  'small-triangle-2': {
    x: S + 114.64,
    y: T + 64.64,
    rotation: 315,
  },
  'square': {
    x: S + 64.64,
    y: T + 114.64,
    rotation: 45,
  },
  'parallelogram': {
    x: S + 104.29,
    y: T + 39.64,
    rotation: 135,
  },
}

/**
 * Validation tolerance (in pixels)
 * Pieces within this tolerance are considered correctly positioned
 */
export const POSITION_TOLERANCE = 20
export const ROTATION_TOLERANCE = 10

/**
 * Check if a piece is in the correct solved position
 */
export function isPieceInSolution(
  pieceType: TangramPieceType,
  currentX: number,
  currentY: number,
  currentRotation: number
): boolean {
  const solution = SQUARE_SOLUTION[pieceType]
  
  const xMatch = Math.abs(currentX - solution.x) < POSITION_TOLERANCE
  const yMatch = Math.abs(currentY - solution.y) < POSITION_TOLERANCE
  
  // Normalize rotations to 0-360 range for comparison
  const normalizedCurrent = ((currentRotation % 360) + 360) % 360
  const normalizedSolution = ((solution.rotation % 360) + 360) % 360
  const rotationDiff = Math.abs(normalizedCurrent - normalizedSolution)
  const rotationMatch = rotationDiff < ROTATION_TOLERANCE || Math.abs(rotationDiff - 360) < ROTATION_TOLERANCE
  
  return xMatch && yMatch && rotationMatch
}

/**
 * Check if a piece (by position/rotation) matches a specific solution slot
 */
function matchesSlot(
  currentX: number,
  currentY: number,
  currentRotation: number,
  slotType: TangramPieceType
): boolean {
  const solution = SQUARE_SOLUTION[slotType]
  const xMatch = Math.abs(currentX - solution.x) < POSITION_TOLERANCE
  const yMatch = Math.abs(currentY - solution.y) < POSITION_TOLERANCE
  const normalizedCurrent = ((currentRotation % 360) + 360) % 360
  const normalizedSolution = ((solution.rotation % 360) + 360) % 360
  const rotationDiff = Math.abs(normalizedCurrent - normalizedSolution)
  const rotationMatch = rotationDiff < ROTATION_TOLERANCE || Math.abs(rotationDiff - 360) < ROTATION_TOLERANCE
  return xMatch && yMatch && rotationMatch
}

/**
 * Check if all pieces are in solved positions, with equivalence groups
 */
export function isSquareSolved(pieces: Array<{
  type: TangramPieceType
  position: { x: number; y: number; rotation: number }
  isPlaced: boolean
}>): boolean {
  // All pieces must be placed
  if (!pieces.every(p => p.isPlaced)) {
    return false
  }

  // Equivalence groups: large triangles and small triangles are interchangeable
  const LARGE_GROUP: [TangramPieceType, TangramPieceType] = ['large-triangle-1', 'large-triangle-2']
  const SMALL_GROUP: [TangramPieceType, TangramPieceType] = ['small-triangle-1', 'small-triangle-2']

  // Helper: check if a group of 2 pieces fills both group solution slots (either assignment)
  function groupSolved(group: [TangramPieceType, TangramPieceType]): boolean {
    const pieceA = pieces.find(p => p.type === group[0])
    const pieceB = pieces.find(p => p.type === group[1])
    if (!pieceA || !pieceB) return false

    // Try assignment A→slot0, B→slot1
    const assign1 =
      matchesSlot(pieceA.position.x, pieceA.position.y, pieceA.position.rotation, group[0]) &&
      matchesSlot(pieceB.position.x, pieceB.position.y, pieceB.position.rotation, group[1])

    // Try assignment A→slot1, B→slot0 (swapped)
    const assign2 =
      matchesSlot(pieceA.position.x, pieceA.position.y, pieceA.position.rotation, group[1]) &&
      matchesSlot(pieceB.position.x, pieceB.position.y, pieceB.position.rotation, group[0])

    return assign1 || assign2
  }

  // Unique pieces must match their own slot exactly
  const UNIQUE_PIECES: TangramPieceType[] = ['medium-triangle', 'square', 'parallelogram']
  for (const type of UNIQUE_PIECES) {
    const piece = pieces.find(p => p.type === type)
    if (!piece) return false
    if (!isPieceInSolution(type, piece.position.x, piece.position.y, piece.position.rotation)) {
      return false
    }
  }

  return groupSolved(LARGE_GROUP) && groupSolved(SMALL_GROUP)
}
