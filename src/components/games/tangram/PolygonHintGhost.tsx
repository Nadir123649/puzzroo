'use client'

import React from 'react'
import { TangramPieceId } from '@shared/types/tangram-polygon'
import { polygonToSVGPath } from '@shared/lib/tangram/polygon-renderer'
import {
  BOARD_VIRTUAL_HEIGHT,
  BOARD_VIRTUAL_WIDTH,
} from '@shared/lib/tangram/boardConfig'

const VIRTUAL_W = BOARD_VIRTUAL_WIDTH
const VIRTUAL_H = BOARD_VIRTUAL_HEIGHT

interface PolygonHintGhostProps {
  pieceId: TangramPieceId
  targetPolygon: number[][]
  color: string
  boardContainerWidth?: number
}

export function PolygonHintGhost({
  targetPolygon,
  color,
}: PolygonHintGhostProps) {
  // Calculate bounding box
  const getBoundingBox = (polygon: number[][]) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const [x, y] of polygon) {
      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
    return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY }
  }

  const bbox = getBoundingBox(targetPolygon)
  const displayWidth = bbox.width
  const displayHeight = bbox.height

  const widthPercent = (displayWidth / VIRTUAL_W) * 100
  const heightPercent = (displayHeight / VIRTUAL_H) * 100
  const leftPercent = (bbox.minX / VIRTUAL_W) * 100
  const topPercent = (bbox.minY / VIRTUAL_H) * 100

  // Create SVG path from target polygon (relative to bounding box)
  const relativePolygon = targetPolygon.map(([x, y]) => [x - bbox.minX, y - bbox.minY])
  const svgPath = polygonToSVGPath(relativePolygon)

  return (
    <div
      className="absolute z-5 pointer-events-none animate-hintPulse"
      style={{
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
        width: `${widthPercent}%`,
        height: `${heightPercent}%`,
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${displayWidth} ${displayHeight}`}
        style={{ overflow: 'visible' }}
      >
        <defs>
          <filter id="hint-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4" />
            <feOffset dx="0" dy="0" result="offsetblur" />
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.8" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Running dots animation on border - PURPLE */}
        <path
          d={svgPath}
          fill={color}
          opacity="0.3"
          stroke="#6949FF"
          strokeWidth="2"
          strokeDasharray="8 4"
          strokeDashoffset="0"
          filter="url(#hint-glow)"
        >
          <animate
            attributeName="stroke-dashoffset"
            from="0"
            to="24"
            dur="1s"
            repeatCount="indefinite"
          />
        </path>
      </svg>
    </div>
  )
}
