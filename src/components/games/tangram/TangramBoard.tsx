/**
 * Tangram Board Component
 * Canvas-based board with grey background, puzzle silhouette, and black piece tray
 */

'use client'

import React, { useRef, useEffect } from 'react'
import {
  BOARD_VIRTUAL_HEIGHT,
  BOARD_VIRTUAL_WIDTH,
  TRAY_TOP,
} from '@shared/lib/tangram/boardConfig'

interface TangramBoardProps {
  children: React.ReactNode
  mobile?: boolean
  silhouette?: string // SVG path data for the puzzle shape
}

export function TangramBoard({ children, mobile = false, silhouette }: TangramBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Dark grey background for entire canvas (#353535)
    ctx.fillStyle = '#353535'
    ctx.fillRect(0, 0, BOARD_VIRTUAL_WIDTH, BOARD_VIRTUAL_HEIGHT)

    // Draw puzzle silhouette (#222222) — absolute board coordinates, no translate needed
    if (silhouette) {
      ctx.save()
      ctx.fillStyle = '#222222'
      const path = new Path2D(silhouette)
      ctx.fill(path)
      ctx.restore()
    }

    // Black tray area (bottom part)
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, TRAY_TOP, BOARD_VIRTUAL_WIDTH, BOARD_VIRTUAL_HEIGHT - TRAY_TOP)
  }, [silhouette])

  return (
    <div
      className={`relative tangram-board-container overflow-visible w-full aspect-[750/493] ${mobile
          ? 'max-w-[450px] mx-auto'
          : 'max-w-[700px]'
        }`}
      style={{ touchAction: 'none' }}
    >
      <canvas
        ref={canvasRef}
        width={BOARD_VIRTUAL_WIDTH}
        height={BOARD_VIRTUAL_HEIGHT}
        className="w-full h-full block rounded-[5px]"
      />

      {/* Pieces overlay on canvas */}
      <div className="absolute inset-0 pointer-events-none overflow-visible">
        <div className="relative w-full h-full pointer-events-auto overflow-visible">
          {children}
        </div>
      </div>
    </div>
  )
}
