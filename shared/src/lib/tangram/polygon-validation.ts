/**
 * Polygon-Based Validation
 * Compare player polygons against target polygons from dataset
 */

import { TangramPieceId } from '@shared/types/tangram-polygon'
import { polygonsMatch, calculatePolygonDistance } from './polygon-geometry'

const SNAP_DISTANCE_THRESHOLD = 15
const VALIDATION_TOLERANCE = 10

export interface PieceValidation {
  pieceId: TangramPieceId
  isCorrect: boolean
  distance: number
}

export interface PuzzleValidation {
  isSolved: boolean
  correctCount: number
  totalCount: number
  pieces: PieceValidation[]
}

export function validatePiecePosition(
  currentPolygon: number[][],
  targetPolygon: number[][],
  tolerance: number = VALIDATION_TOLERANCE
): boolean {
  return polygonsMatch(currentPolygon, targetPolygon, tolerance)
}

export function findClosestTargetSlot(
  currentPolygon: number[][],
  targetPolygons: number[][][],
  threshold: number = SNAP_DISTANCE_THRESHOLD
): number | null {
  let closestIndex: number | null = null
  let closestDistance = threshold
  
  for (let i = 0; i < targetPolygons.length; i++) {
    const distance = calculatePolygonDistance(currentPolygon, targetPolygons[i])
    if (distance < closestDistance) {
      closestDistance = distance
      closestIndex = i
    }
  }
  
  return closestIndex
}

export function validatePuzzle(
  pieceIds: TangramPieceId[],
  currentPolygons: number[][][],
  targetPolygons: number[][][]
): PuzzleValidation {
  const pieces: PieceValidation[] = []
  let correctCount = 0
  
  // Track which target slots have been claimed by a correct piece
  const claimedSlots = new Set<number>()
  
  for (let i = 0; i < pieceIds.length; i++) {
    const pieceId = pieceIds[i]
    const currentPoly = currentPolygons[i]
    
    // Get all valid target indices for this piece (includes interchangeable slots)
    const validIndices = getValidTargetIndices(pieceId, pieceIds.map(id => id as string))
    
    let isCorrect = false
    let bestDistance = Infinity
    
    for (const targetIdx of validIndices) {
      if (claimedSlots.has(targetIdx)) continue
      
      const targetPoly = targetPolygons[targetIdx]
      
      // Use order-independent vertex matching for validation
      if (currentPoly.length === targetPoly.length) {
        let allVerticesMatch = true
        for (const [x1, y1] of currentPoly) {
          let foundMatch = false
          for (const [x2, y2] of targetPoly) {
            const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
            if (dist < VALIDATION_TOLERANCE) {
              foundMatch = true
              break
            }
          }
          if (!foundMatch) {
            allVerticesMatch = false
            break
          }
        }
        
        if (allVerticesMatch) {
          isCorrect = true
          claimedSlots.add(targetIdx)
          bestDistance = 0
          break
        }
      }
      
      const distance = calculatePolygonDistance(currentPoly, targetPoly)
      if (distance < bestDistance) {
        bestDistance = distance
      }
    }
    
    pieces.push({
      pieceId,
      isCorrect,
      distance: bestDistance
    })
    
    if (isCorrect) correctCount++
  }
  
  return {
    isSolved: correctCount === pieceIds.length,
    correctCount,
    totalCount: pieceIds.length,
    pieces
  }
}

export const INTERCHANGEABLE_GROUPS: TangramPieceId[][] = [
  ['baseTriangle1', 'baseTriangle2'],
  ['smallTriangle1', 'smallTriangle2']
]

export function findInterchangeableGroup(pieceId: TangramPieceId): TangramPieceId[] | null {
  for (const group of INTERCHANGEABLE_GROUPS) {
    if (group.includes(pieceId)) return group
  }
  return null
}

export function getValidTargetIndices(
  pieceId: TangramPieceId,
  pieceShapeIds: string[]
): number[] {
  const group = findInterchangeableGroup(pieceId)
  
  if (!group) {
    return pieceShapeIds
      .map((id, index) => id === pieceId ? index : -1)
      .filter(index => index !== -1)
  }
  
  return pieceShapeIds
    .map((id, index) => group.includes(id as TangramPieceId) ? index : -1)
    .filter(index => index !== -1)
}
