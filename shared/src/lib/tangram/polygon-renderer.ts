/**
 * Polygon Rendering Utilities
 * Scales and centers polygon datasets for board display
 */

import { BOARD_VIRTUAL_WIDTH, SILHOUETTE_HEIGHT } from './boardConfig'

const PADDING = 15

interface BoundingBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
}

export function calculatePolygonBounds(polygon: number[][]): BoundingBox {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const [x, y] of polygon) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  }
}

export function scaleAndCenterPolygon(
  polygon: number[][],
  targetWidth: number = BOARD_VIRTUAL_WIDTH - 2 * PADDING,
  targetHeight: number = SILHOUETTE_HEIGHT - 2 * PADDING
): { polygon: number[][], scale: number, offsetX: number, offsetY: number } {
  const bounds = calculatePolygonBounds(polygon)
  
  const scaleX = targetWidth / bounds.width
  const scaleY = targetHeight / bounds.height
  let scale = Math.min(scaleX, scaleY)
  
  // Cap the scale to prevent pieces from becoming too large and overflowing the tray
  const MAX_SCALE = 11.0
  if (scale > MAX_SCALE) {
    scale = MAX_SCALE
  }
  
  const scaledWidth = bounds.width * scale
  const scaledHeight = bounds.height * scale
  
  const offsetX = (targetWidth - scaledWidth) / 2 + PADDING - bounds.minX * scale
  const offsetY = (targetHeight - scaledHeight) / 2 + PADDING - bounds.minY * scale
  
  const scaledPolygon = polygon.map(([x, y]) => [
    x * scale + offsetX,
    y * scale + offsetY
  ])
  
  return {
    polygon: scaledPolygon,
    scale,
    offsetX,
    offsetY
  }
}

export function polygonToSVGPath(polygon: number[][]): string {
  if (polygon.length === 0) return ''
  
  const [startX, startY] = polygon[0]
  let path = `M ${startX.toFixed(2)} ${startY.toFixed(2)}`
  
  for (let i = 1; i < polygon.length; i++) {
    const [x, y] = polygon[i]
    path += ` L ${x.toFixed(2)} ${y.toFixed(2)}`
  }
  
  path += ' Z'
  return path
}
