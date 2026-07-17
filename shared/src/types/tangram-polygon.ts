/**
 * Polygon-based Tangram Type Definitions
 * Source of truth: stored polygon datasets
 */

export interface PolygonPuzzle {
  id: string
  sourceId: string
  difficulty: 'easy' | 'medium' | 'hard'
  pieceShapeIds: string[]
  individualPiecePolygons: number[][][]
  fullPolygon: number[][]
  gameType: 'tangram'
  active: boolean
}

export type TangramPieceId =
  | 'baseTriangle1'
  | 'baseTriangle2'
  | 'mediumTriangle'
  | 'smallTriangle1'
  | 'smallTriangle2'
  | 'square'
  | 'parallelogram'

export interface TangramPieceState {
  id: TangramPieceId
  polygon: number[][]
  targetPolygon: number[][]
  color: string
  isDragging: boolean
  isSnapped: boolean
}
