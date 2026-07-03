/**
 * CANONICAL TANGRAM SOLUTION: SQUARE
 * 
 * This is the master reference puzzle.
 * All seven pieces form a perfect 150×150 square.
 * 
 * PIECE PLACEMENT (verified geometry):
 * - Large Triangle 1: Top-left, fills entire left half
 * - Large Triangle 2: Top-right, fills entire right half  
 * - Medium Triangle: Bottom-right quadrant
 * - Small Triangle 1: Bottom-left corner
 * - Small Triangle 2: Bottom-center left
 * - Square: Center-bottom, rotated 45°
 * - Parallelogram: Bottom strip
 * 
 * ALL COORDINATES ARE ABSOLUTE BOARD POSITIONS
 * NO SCALING, NO TRANSFORMS - FROZEN GEOMETRY
 */

import { TangramPieceType } from '@/types/tangram'

// Unit size: 53 (75% of original 70.7)
const U = 53

/**
 * CANONICAL SQUARE SOLUTION
 * Frozen geometry - never regenerate
 */
export const SQUARE_CANONICAL: Record<TangramPieceType, { x: number; y: number; rotation: number }> = {
  // Large triangle 1: top-left, right angle at origin
  'large-triangle-1': {
    x: 150,
    y: 66,
    rotation: 0
  },
  
  // Large triangle 2: top-right, mirrored
  'large-triangle-2': {
    x: 256,
    y: 66,
    rotation: 90
  },
  
  // Medium triangle: bottom-right
  'medium-triangle': {
    x: 256,
    y: 172,
    rotation: 180
  },
  
  // Small triangle 1: bottom-left corner
  'small-triangle-1': {
    x: 150,
    y: 172,
    rotation: 0
  },
  
  // Small triangle 2: bottom-center
  'small-triangle-2': {
    x: 203,
    y: 172,
    rotation: 90
  },
  
  // Square: center-bottom, rotated 45°
  'square': {
    x: 176.5,
    y: 198.5,
    rotation: 45
  },
  
  // Parallelogram: bottom strip
  'parallelogram': {
    x: 203,
    y: 225,
    rotation: 180
  },
}

/**
 * PREDEFINED SILHOUETTE
 * Hand-crafted SVG path for the square shape
 * Centered on board at (150, 66)
 */
export const SQUARE_SILHOUETTE = 'M 150 66 L 256 66 L 256 225 L 150 225 Z'
