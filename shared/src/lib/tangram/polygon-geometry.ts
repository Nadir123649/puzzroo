/**
 * Polygon Geometry Utilities
 * Transformation, comparison, and validation logic for polygon-based Tangram
 */

export interface Point {
  x: number
  y: number
}

export interface Transform {
  x: number
  y: number
  rotation: number
}

const POSITION_TOLERANCE = 15
const ROTATION_TOLERANCE = 10

export function polygonToPoints(polygon: number[][]): Point[] {
  return polygon.map(([x, y]) => ({ x, y }))
}

export function pointsToPolygon(points: Point[]): number[][] {
  return points.map(p => [p.x, p.y])
}

export function transformPolygon(polygon: number[][], transform: Transform): number[][] {
  const points = polygonToPoints(polygon)
  const centroid = calculateCentroid(points)
  
  const rotatedPoints = rotatePointsAroundCenter(points, centroid, transform.rotation)
  const translatedPoints = rotatedPoints.map(p => ({
    x: p.x + transform.x,
    y: p.y + transform.y
  }))
  
  return pointsToPolygon(translatedPoints)
}

export function calculateCentroid(points: Point[]): Point {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 })
  return { x: sum.x / points.length, y: sum.y / points.length }
}

export function rotatePointsAroundCenter(points: Point[], center: Point, degrees: number): Point[] {
  const radians = (degrees * Math.PI) / 180
  const cos = Math.cos(radians)
  const sin = Math.sin(radians)
  
  return points.map(p => {
    const dx = p.x - center.x
    const dy = p.y - center.y
    return {
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos
    }
  })
}

export function polygonsMatch(poly1: number[][], poly2: number[][], tolerance: number = POSITION_TOLERANCE): boolean {
  if (poly1.length !== poly2.length) return false
  
  for (let i = 0; i < poly1.length; i++) {
    const [x1, y1] = poly1[i]
    const [x2, y2] = poly2[i]
    const dist = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
    if (dist > tolerance) return false
  }
  
  return true
}

export function calculatePolygonDistance(poly1: number[][], poly2: number[][]): number {
  if (poly1.length !== poly2.length) return Infinity
  
  let totalDist = 0
  for (let i = 0; i < poly1.length; i++) {
    const [x1, y1] = poly1[i]
    const [x2, y2] = poly2[i]
    totalDist += Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
  }
  
  return totalDist / poly1.length
}

export function normalizeRotation(degrees: number): number {
  return ((degrees % 360) + 360) % 360
}

export function rotationDifference(rot1: number, rot2: number): number {
  const diff = Math.abs(normalizeRotation(rot1) - normalizeRotation(rot2))
  return Math.min(diff, 360 - diff)
}
