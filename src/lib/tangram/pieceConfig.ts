/**
 * Tangram Piece Configuration
 * Canonical geometry definitions for all 7 Tangram pieces
 * 
 * STANDARD TANGRAM PROPORTIONS:
 * If the solved square is 200×200px, then:
 * - Base unit = 70.7px (200 / √8)
 * - Large triangles: legs = 2 units = 141.4px
 * - Medium triangle: legs = √2 units = 100px
 * - Small triangles: legs = 1 unit = 70.7px
 * - Square: side = 1 unit = 70.7px
 * - Parallelogram: sides = 1 unit & √2 units, area = 1 unit²
 */

export const PIECE_SCALE = 0.75 // Centralized scale factor (25% reduction)
export const UNIT = 70.7 * PIECE_SCALE // Base unit for 200×200px square (scaled)

/**
 * Standard Tangram piece definitions
 * Using mathematically correct proportions for 200×200px square
 */
export const PIECE_CONFIG = {
  'large-triangle-1': {
    displayWidth: UNIT * 2,   // 141.4px
    displayHeight: UNIT * 2,  // 141.4px
    area: (UNIT * 2 * UNIT * 2) / 2,
    svgPath: `M 0 0 L ${UNIT * 2} 0 L 0 ${UNIT * 2} Z`,
    rotationOrigin: { x: UNIT, y: UNIT },
  },
  
  'large-triangle-2': {
    displayWidth: UNIT * 2,
    displayHeight: UNIT * 2,
    area: (UNIT * 2 * UNIT * 2) / 2,
    svgPath: `M 0 0 L ${UNIT * 2} 0 L 0 ${UNIT * 2} Z`,
    rotationOrigin: { x: UNIT, y: UNIT },
  },
  
  'medium-triangle': {
    displayWidth: UNIT * Math.SQRT2,
    displayHeight: UNIT * Math.SQRT2,
    area: (UNIT * Math.SQRT2 * UNIT * Math.SQRT2) / 2,
    svgPath: `M 0 0 L ${UNIT * Math.SQRT2} 0 L 0 ${UNIT * Math.SQRT2} Z`,
    rotationOrigin: { x: UNIT * Math.SQRT2 / 2, y: UNIT * Math.SQRT2 / 2 },
  },
  
  'small-triangle-1': {
    displayWidth: UNIT,
    displayHeight: UNIT,
    area: (UNIT * UNIT) / 2,
    svgPath: `M 0 0 L ${UNIT} 0 L 0 ${UNIT} Z`,
    rotationOrigin: { x: UNIT / 2, y: UNIT / 2 },
  },
  
  'small-triangle-2': {
    displayWidth: UNIT,
    displayHeight: UNIT,
    area: (UNIT * UNIT) / 2,
    svgPath: `M 0 0 L ${UNIT} 0 L 0 ${UNIT} Z`,
    rotationOrigin: { x: UNIT / 2, y: UNIT / 2 },
  },
  
  'square': {
    displayWidth: UNIT,
    displayHeight: UNIT,
    area: UNIT * UNIT,
    svgPath: `M 0 0 L ${UNIT} 0 L ${UNIT} ${UNIT} L 0 ${UNIT} Z`,
    rotationOrigin: { x: UNIT / 2, y: UNIT / 2 },
  },
  
  'parallelogram': {
    displayWidth: UNIT * 2,    // 141.4px - full width of bounding box
    displayHeight: UNIT,       // 70.7px
    area: UNIT * UNIT,
    // MIRRORED: Parallelogram with RIGHT-side vertical, slanting left
    // Shape: |\
    //        | \
    //        |  |
    //         \ |
    //          \|
    // Vertices: (0, UNIT) → (UNIT, 0) → (2*UNIT, 0) → (UNIT, UNIT)
    svgPath: `M 0 ${UNIT} L ${UNIT} 0 L ${UNIT * 2} 0 L ${UNIT} ${UNIT} Z`,
    rotationOrigin: { x: UNIT, y: UNIT / 2 },
  },
} as const

/**
 * Calculate total area of all pieces
 */
export const TOTAL_AREA = Object.values(PIECE_CONFIG).reduce((sum, piece) => sum + piece.area, 0)

/**
 * Calculate target square dimensions
 * For standard Tangram: should be 200×200px
 */
export const TARGET_SQUARE_SIZE = 200 * PIECE_SCALE // Standard Tangram square (scaled)

/**
 * Valid rotation angles (in degrees)
 * Tangram pieces can only be rotated to these angles
 */
export const VALID_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315] as const

/**
 * Snap rotation to nearest valid angle
 */
export function snapRotation(angle: number): number {
  const normalized = ((angle % 360) + 360) % 360
  let closest: number = VALID_ANGLES[0]
  let minDiff = Math.abs(normalized - closest)

  for (const validAngle of VALID_ANGLES) {
    const diff = Math.abs(normalized - validAngle)
    if (diff < minDiff) {
      minDiff = diff
      closest = validAngle
    }
  }

  return closest
}

export type TangramPieceType = keyof typeof PIECE_CONFIG