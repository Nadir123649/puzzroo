/**
 * Tangram Validation Engine
 * Uses position-based validation against canonical solution
 * 
 * VALIDATION APPROACH:
 * Instead of pixel-perfect grid validation, we compare piece positions
 * against the known correct solution with reasonable tolerance
 */

import { TangramPiece, TangramPieceType } from '@/types/tangram'
import { TARGET_SQUARE_SIZE, PIECE_CONFIG } from './pieceConfig'
import { SQUARE_SOLUTION, isPieceInSolution, isSquareSolved } from './squareSolution'
import { SQUARE_LEFT, SQUARE_TOP } from './snapping'
import { BOARD_VIRTUAL_WIDTH } from './boardConfig'

const GRID_SIZE = 50
const TARGET_SIZE = Math.round(TARGET_SQUARE_SIZE) // ~283px

interface ValidationResult {
  isSolved: boolean
  coverage: number
  overflow: number
  allPiecesUsed: boolean
  allPiecesPlaced: boolean
}

/**
 * Generate target grid - 142×142px square
 */
export function generateTargetGrid(): number[][] {
  const grid: number[][] = []
  const boardWidth = BOARD_VIRTUAL_WIDTH
  const centerX = SQUARE_LEFT
  const centerY = SQUARE_TOP
  const cellSize = boardWidth / GRID_SIZE
  
  for (let row = 0; row < GRID_SIZE; row++) {
    grid[row] = []
    for (let col = 0; col < GRID_SIZE; col++) {
      const cellX = col * cellSize
      const cellY = row * cellSize
      
      const isInside = 
        cellX >= centerX && 
        cellX < centerX + TARGET_SIZE &&
        cellY >= centerY && 
        cellY < centerY + TARGET_SIZE
      
      grid[row][col] = isInside ? 1 : 0
    }
  }
  
  return grid
}

/**
 * Generate player grid based on current piece positions
 */
export function generatePlayerGrid(pieces: TangramPiece[]): number[][] {
  const grid: number[][] = Array(GRID_SIZE).fill(0).map(() => Array(GRID_SIZE).fill(0))
  const boardWidth = BOARD_VIRTUAL_WIDTH
  const cellSize = boardWidth / GRID_SIZE
  const placedPieces = pieces.filter(p => p.isPlaced)
  
  placedPieces.forEach(piece => {
    const vertices = getPieceVertices(piece)
    
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cellX = col * cellSize + cellSize / 2
        const cellY = row * cellSize + cellSize / 2
        
        if (isPointInPolygon(cellX, cellY, vertices)) {
          grid[row][col] = 1
        }
      }
    }
  })
  
  return grid
}

/**
 * Get piece vertices - MATCHES PIECE_CONFIG geometry
 */
function getPieceVertices(piece: TangramPiece): [number, number][] {
  const { x, y, rotation } = piece.position
  const rad = (rotation * Math.PI) / 180
  const UNIT = 70.7
  
  let baseVertices: [number, number][] = []
  let cx = 0
  let cy = 0
  
  switch (piece.type) {
    case 'large-triangle-1':
    case 'large-triangle-2':
      baseVertices = [[0, 0], [UNIT * 2, 0], [0, UNIT * 2]]
      cx = UNIT
      cy = UNIT
      break
    case 'medium-triangle':
      baseVertices = [[0, 0], [UNIT * Math.SQRT2, 0], [0, UNIT * Math.SQRT2]]
      cx = (UNIT * Math.SQRT2) / 2
      cy = (UNIT * Math.SQRT2) / 2
      break
    case 'small-triangle-1':
    case 'small-triangle-2':
      baseVertices = [[0, 0], [UNIT, 0], [0, UNIT]]
      cx = UNIT / 2
      cy = UNIT / 2
      break
    case 'square':
      baseVertices = [[0, 0], [UNIT, 0], [UNIT, UNIT], [0, UNIT]]
      cx = UNIT / 2
      cy = UNIT / 2
      break
    case 'parallelogram':
      baseVertices = [[UNIT, 0], [UNIT * 2, 0], [UNIT, UNIT], [0, UNIT]]
      cx = UNIT
      cy = UNIT / 2
      break
  }
  
  // Apply rotation around center, then translate
  return baseVertices.map(([vx, vy]) => {
    const dx = vx - cx
    const dy = vy - cy
    const rotatedX = cx + dx * Math.cos(rad) - dy * Math.sin(rad)
    const rotatedY = cy + dx * Math.sin(rad) + dy * Math.cos(rad)
    return [x + rotatedX, y + rotatedY] as [number, number]
  })
}

/**
 * Ray casting algorithm
 */
function isPointInPolygon(x: number, y: number, vertices: [number, number][]): boolean {
  let inside = false
  
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const [xi, yi] = vertices[i]
    const [xj, yj] = vertices[j]
    
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi)
    
    if (intersect) inside = !inside
  }
  
  return inside
}

/**
 * Validate puzzle completion using solution-based approach
 */
export function validatePuzzle(pieces: TangramPiece[]): ValidationResult {
  const allPiecesUsed = pieces.length === 7
  const allPiecesPlaced = pieces.every(p => p.isPlaced)
  
  // Primary validation: Check if pieces match canonical solution
  const isSolved = isSquareSolved(pieces)
  
  // Secondary validation: Grid-based coverage check (for partial progress)
  const targetGrid = generateTargetGrid()
  const playerGrid = generatePlayerGrid(pieces)
  
  let targetCells = 0
  let coveredCells = 0
  let overflowCells = 0
  
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const isTarget = targetGrid[row][col] === 1
      const isCovered = playerGrid[row][col] === 1
      
      if (isTarget) {
        targetCells++
        if (isCovered) coveredCells++
      } else if (isCovered) {
        overflowCells++
      }
    }
  }
  
  const coverage = targetCells > 0 ? (coveredCells / targetCells) * 100 : 0
  const overflow = targetCells > 0 ? (overflowCells / targetCells) * 100 : 0
  
  return {
    isSolved,
    coverage,
    overflow,
    allPiecesUsed,
    allPiecesPlaced,
  }
}

/**
 * TASK 8: AutoFill with canonical solution
 * Returns solved positions for all pieces
 */
export function getSolvedSquarePositions(): Record<TangramPieceType, { x: number; y: number; rotation: number }> {
  // Return the canonical solution directly
  return SQUARE_SOLUTION
}
