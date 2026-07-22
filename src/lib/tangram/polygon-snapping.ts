/**
 * Polygon-Based Snapping
 * Snap pieces to target polygon positions
 */

import { TangramPieceId } from '@/types/tangram-polygon'
import { calculatePolygonDistance, calculateCentroid, polygonToPoints } from './polygon-geometry'
import { getValidTargetIndices } from './polygon-validation'

const SNAP_THRESHOLD = 35

export function geometricallyMatches(poly1: number[][], poly2: number[][], threshold: number = 25): boolean {
  if (poly1.length !== poly2.length) return false
  
  for (const [x1, y1] of poly1) {
    let foundMatch = false
    for (const [x2, y2] of poly2) {
      const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
      if (dist < threshold) {
        foundMatch = true
        break
      }
    }
    if (!foundMatch) return false
  }
  
  return true
}

export function calculateGeomCentroidDistance(poly1: number[][], poly2: number[][]): number {
  const c1 = calculateCentroid(polygonToPoints(poly1))
  const c2 = calculateCentroid(polygonToPoints(poly2))
  const dx = c2.x - c1.x
  const dy = c2.y - c1.y
  return Math.sqrt(dx * dx + dy * dy)
}

export interface SnapResult {
  shouldSnap: boolean
  targetIndex: number
  targetPolygon: number[][]
  snapTransform: {
    x: number
    y: number
    rotation: number
  }
}

const getTargetRotation = (pieceType: string, scaledTarget: number[][], scale: number): number => {
  const puzzleUnit = 5 * scale
  
  const basePolygons: Record<string, number[][]> = {
    'large-triangle-1': [[0, 0], [puzzleUnit * 2, 0], [0, puzzleUnit * 2], [0, 0]],
    'large-triangle-2': [[0, 0], [puzzleUnit * 2, 0], [0, puzzleUnit * 2], [0, 0]],
    'medium-triangle': [[0, 0], [puzzleUnit * Math.SQRT2, 0], [0, puzzleUnit * Math.SQRT2], [0, 0]],
    'small-triangle-1': [[0, 0], [puzzleUnit, 0], [0, puzzleUnit], [0, 0]],
    'small-triangle-2': [[0, 0], [puzzleUnit, 0], [0, puzzleUnit], [0, 0]],
    'square': [[0, 0], [puzzleUnit, 0], [puzzleUnit, puzzleUnit], [0, puzzleUnit], [0, 0]],
    'parallelogram': [[0, puzzleUnit], [puzzleUnit, 0], [puzzleUnit * 2, 0], [puzzleUnit, puzzleUnit], [0, puzzleUnit]]
  }
  
  const base = basePolygons[pieceType]
  if (!base || base.length === 0 || scaledTarget.length === 0) return 0
  
  // Calculate centroid of scaledTarget
  const targetCx = scaledTarget.reduce((sum, p) => sum + p[0], 0) / scaledTarget.length
  const targetCy = scaledTarget.reduce((sum, p) => sum + p[1], 0) / scaledTarget.length
  const centeredTarget = scaledTarget.map(([x, y]) => [x - targetCx, y - targetCy])
  
  // If it's a parallelogram, check standard AND mirrored bases
  const baseOptions = [base]
  if (pieceType === 'parallelogram') {
    const baseMirrored = [[0, 0], [puzzleUnit, 0], [puzzleUnit * 2, puzzleUnit], [puzzleUnit, puzzleUnit], [0, 0]]
    baseOptions.push(baseMirrored)
  }

  for (const currentBase of baseOptions) {
    const baseAvgX = currentBase.reduce((sum, p) => sum + p[0], 0) / currentBase.length
    const baseAvgY = currentBase.reduce((sum, p) => sum + p[1], 0) / currentBase.length
    
    // Test 8 possible rotations (0, 45, 90, 135, 180, 225, 270, 315)
    for (let r = 0; r < 360; r += 45) {
      const radians = (r * Math.PI) / 180
      const cos = Math.cos(radians)
      const sin = Math.sin(radians)
      
      const rotated = currentBase.map(([x, y]) => {
        const dx = x - baseAvgX
        const dy = y - baseAvgY
        return [
          dx * cos - dy * sin,
          dx * sin + dy * cos
        ]
      })
      
      let allMatched = true
      for (const [tx, ty] of centeredTarget) {
        const hasMatch = rotated.some(([rx, ry]) => {
          const dx = rx - tx
          const dy = ry - ty
          return Math.sqrt(dx * dx + dy * dy) < 5.0
        })
        if (!hasMatch) {
          allMatched = false
          break
        }
      }
      
      if (allMatched) {
        return r
      }
    }
  }
  
  return 0
}

/**
 * Attempt to snap a piece to its target position
 */
export function attemptSnap(
  pieceId: TangramPieceId,
  currentPolygon: number[][],
  currentTransform: { x: number; y: number; rotation: number },
  targetPolygons: number[][][],
  pieceShapeIds: string[],
  scale: number = 1,
  occupiedTargetIndices: Set<number> = new Set()
): SnapResult | null {
  const validIndices = getValidTargetIndices(pieceId, pieceShapeIds)
  
  let bestIndex: number | null = null
  let bestDistance = SNAP_THRESHOLD
  
  const PIECE_TYPE_MAP: Record<string, string> = {
    'baseTriangle1': 'large-triangle-1',
    'baseTriangle2': 'large-triangle-2',
    'mediumTriangle': 'medium-triangle',
    'smallTriangle1': 'small-triangle-1',
    'smallTriangle2': 'small-triangle-2',
    'square': 'square',
    'parallelogram': 'parallelogram'
  }
  
  const pieceType = PIECE_TYPE_MAP[pieceId] || 'square'
  const ownIndex = pieceShapeIds.indexOf(pieceId)
  
  for (const index of validIndices) {
    if (occupiedTargetIndices.has(index)) continue
    
    const targetPolygon = targetPolygons[index]
    
    // Check if the current polygon geometrically matches the target slot polygon (order-independent)
    if (geometricallyMatches(currentPolygon, targetPolygon, SNAP_THRESHOLD)) {
      // Calculate relative rotation between the snapped target slot and the piece's own target slot
      const ownTargetPolygon = ownIndex !== -1 ? targetPolygons[ownIndex] : targetPolygon
      const targetRotation = getTargetRotation(pieceType, targetPolygon, scale)
      const baseRotation = getTargetRotation(pieceType, ownTargetPolygon, scale)
      const snapRotation = ((targetRotation - baseRotation) % 360 + 360) % 360
      
      // Enforce rotation check with rotational symmetry
      let symmetry = 360
      if (pieceId === 'square') {
        symmetry = 90
      } else if (pieceId === 'parallelogram') {
        symmetry = 180
      }

      const rotDiff = Math.abs((currentTransform.rotation - snapRotation) % 360)
      const symDiff = rotDiff % symmetry
      const normalizedRotDiff = symDiff > symmetry / 2 ? symmetry - symDiff : symDiff
      if (normalizedRotDiff > 20) {
        continue
      }
      
      const distance = calculateGeomCentroidDistance(currentPolygon, targetPolygon)
      if (distance < bestDistance) {
        bestDistance = distance
        bestIndex = index
      }
    }
  }
  
  if (bestIndex === null) return null
  
  const targetPolygon = targetPolygons[bestIndex]
  const targetCentroid = calculateCentroid(polygonToPoints(targetPolygon))
  
  // Get piece's own solved slot target polygon in the puzzle
  const ownTargetPolygon = ownIndex !== -1 ? targetPolygons[ownIndex] : targetPolygon
  const targetRotation = getTargetRotation(pieceType, targetPolygon, scale)
  const baseRotation = getTargetRotation(pieceType, ownTargetPolygon, scale)
  
  // Adjust transform.rotation to match the relative angle offset
  const snapRotation = ((targetRotation - baseRotation) % 360 + 360) % 360
  
  return {
    shouldSnap: true,
    targetIndex: bestIndex,
    targetPolygon,
    snapTransform: {
      x: targetCentroid.x,
      y: targetCentroid.y,
      rotation: snapRotation
    }
  }
}

export function calculateSnapTransform(
  basePolygon: number[][],
  currentTransform: { x: number; y: number; rotation: number },
  targetPolygon: number[][]
): { x: number; y: number; rotation: number } {
  const baseCentroid = calculateCentroid(polygonToPoints(basePolygon))
  const targetCentroid = calculateCentroid(polygonToPoints(targetPolygon))
  
  return {
    x: targetCentroid.x - baseCentroid.x,
    y: targetCentroid.y - baseCentroid.y,
    rotation: currentTransform.rotation
  }
}
