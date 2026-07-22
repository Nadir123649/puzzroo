export interface Point {
  x: number;
  y: number;
}

export type Polygon = Point[];

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface PolygonIntersection {
  intersects: boolean;
  intersectionArea: number;
}

export interface PolygonCoverage {
  coveredArea: number;
  targetArea: number;
  coverageRatio: number;
  gaps: Polygon[];
  overlaps: Polygon[];
}

export interface PieceValidationInput {
  pieceId: string;
  originalPolygon: number[][];
  transformedPolygon: number[][];
  position: { x: number; y: number };
  rotation: number;
  flipped: boolean;
}

export interface PieceValidationOutput {
  pieceId: string;
  valid: boolean;
  inBounds: boolean;
  correctRotation: boolean;
  overlaps: boolean;
  positionMatch: boolean;
  errors: string[];
}
