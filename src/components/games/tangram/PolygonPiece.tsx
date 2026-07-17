'use client'

import React, { useRef, useState, useEffect } from 'react'
import { TangramPieceId } from '@shared/types/tangram-polygon'
import { OrbitalHelper } from './OrbitalHelper'
import { polygonToSVGPath } from '@shared/lib/tangram/polygon-renderer'
import {
  BOARD_VIRTUAL_HEIGHT,
  BOARD_VIRTUAL_WIDTH,
} from '@shared/lib/tangram/boardConfig'

const VIRTUAL_W = BOARD_VIRTUAL_WIDTH
const VIRTUAL_H = BOARD_VIRTUAL_HEIGHT

interface PieceState {
  id: TangramPieceId
  basePolygon: number[][]
  currentPolygon: number[][]
  targetPolygon: number[][]
  transform: { x: number; y: number; rotation: number }
  color: string
  isPlaced: boolean
  isSnapped: boolean
}

interface PolygonPieceProps {
  piece: PieceState
  isSelected: boolean
  onSelect: () => void
  onMove: (x: number, y: number, onSnapSuccess?: () => void) => void
  onRotateLeft: () => void
  onRotateRight: () => void
  boardContainerWidth?: number
  allPieces?: PieceState[]
  disabled?: boolean
  onDragEnd?: () => void
}

export function PolygonPiece({
  piece,
  isSelected,
  onSelect,
  onMove,
  onRotateLeft,
  onRotateRight,
  boardContainerWidth,
  disabled = false,
  onDragEnd,
}: PolygonPieceProps) {
  const dragStartPos = useRef<{ x: number; y: number } | null>(null)
  const pieceStartPos = useRef<{ x: number; y: number } | null>(null)
  const isDraggingRef = useRef(false)
  const [showPulse, setShowPulse] = useState(false)
  const [dragRotation, setDragRotation] = useState<number | null>(null)

  // Use transform.x and transform.y as STABLE center (never changes during rotation)
  const cx = piece.transform.x
  const cy = piece.transform.y

  // Calculate UNROTATED centroid from basePolygon for SVG path generation
  const baseCx = piece.basePolygon.reduce((sum, p) => sum + p[0], 0) / piece.basePolygon.length
  const baseCy = piece.basePolygon.reduce((sum, p) => sum + p[1], 0) / piece.basePolygon.length

  // Create UNROTATED relative polygon for SVG (rotation applied via CSS transform)
  const relativePolygon = piece.basePolygon.map(([x, y]) => [x - baseCx, y - baseCy])
  const svgPath = polygonToSVGPath(relativePolygon)

  // Pointer drag for movement
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()

    onSelect()

    const target = e.currentTarget as Element
    const boardElement = target.closest('.tangram-board-container')
    if (!boardElement) return

    const boardRect = boardElement.getBoundingClientRect()

    dragStartPos.current = { x: e.clientX, y: e.clientY }
    pieceStartPos.current = { x: cx, y: cy }
    isDraggingRef.current = true

    // Capture the pointer to handle dragging on mobile/touch screens smoothly
    try {
      (target as HTMLElement).setPointerCapture(e.pointerId)
    } catch (err) {}

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!dragStartPos.current || !pieceStartPos.current) return

      const deltaX = moveEvent.clientX - dragStartPos.current.x
      const deltaY = moveEvent.clientY - dragStartPos.current.y

      const scaleX = VIRTUAL_W / boardRect.width
      const scaleY = VIRTUAL_H / boardRect.height
      const newCenterX = pieceStartPos.current.x + deltaX * scaleX
      const newCenterY = pieceStartPos.current.y + deltaY * scaleY

      // Clamp piece center to stay inside the board bounds
      const clampedX = Math.max(0, Math.min(VIRTUAL_W, newCenterX))
      const clampedY = Math.max(0, Math.min(VIRTUAL_H, newCenterY))

      onMove(clampedX, clampedY, () => {
        setShowPulse(true)
        setTimeout(() => setShowPulse(false), 600)
      })
    }

    const handlePointerUp = (upEvent: PointerEvent) => {
      try {
        (target as HTMLElement).releasePointerCapture(upEvent.pointerId)
      } catch (err) {}

      if (onDragEnd) {
        onDragEnd()
      }

      dragStartPos.current = null
      pieceStartPos.current = null
      isDraggingRef.current = false
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
      document.removeEventListener('pointercancel', handlePointerUp)
    }

    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
    document.addEventListener('pointercancel', handlePointerUp)
  }

  const leftPercent = (cx / VIRTUAL_W) * 100
  const topPercent = (cy / VIRTUAL_H) * 100

  // Total rotation = base rotation + visual offset or absolute drag rotation
  const totalRotation = dragRotation !== null ? dragRotation : piece.transform.rotation
  const isRotating = dragRotation !== null

  const isAnimating = !isDraggingRef.current
  const positionTransition = isAnimating
    ? 'left 0.3s cubic-bezier(0.25, 1, 0.5, 1), top 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
    : 'none'
  
  // Smooth transform transition for the SVG elements
  const transformTransition = isAnimating && !isRotating
    ? 'transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
    : 'none'

  const orbitalBoardWidth = boardContainerWidth ?? VIRTUAL_W
  let orbitalRadius = 85
  if (orbitalBoardWidth < 450) orbitalRadius = 60
  else if (orbitalBoardWidth < 700) orbitalRadius = 72

  const handleContinuousRotate = (absoluteRotation: number) => {
    setDragRotation(absoluteRotation)
  }

  const handleContinuousRotateEnd = () => {
    if (dragRotation === null) return

    // Snap to nearest 45 degrees based on current drag rotation
    const snappedRotation = Math.round(dragRotation / 45) * 45
    const diff = snappedRotation - piece.transform.rotation
    const steps = Math.round(diff / 45)
    
    if (steps > 0) {
      for (let i = 0; i < steps; i++) {
        onRotateRight()
      }
    } else if (steps < 0) {
      for (let i = 0; i < Math.abs(steps); i++) {
        onRotateLeft()
      }
    }

    setDragRotation(null)
  }

  return (
    <>
      {/* SVG covering the entire board */}
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${VIRTUAL_W} ${VIRTUAL_H}`}
        className="absolute inset-0 overflow-visible"
        style={{
          pointerEvents: 'none',
          zIndex: isSelected ? 50 : 10,
          touchAction: 'none',
        }}
      >
        {/* Translation Container - positions piece at (cx, cy) */}
        <g
          style={{
            transform: `translate(${cx}px, ${cy}px)`,
            transition: transformTransition,
          }}
        >
          {/* Rotation Container - applies total rotation around (0,0) */}
          <g
            style={{
              transform: `rotate(${totalRotation}deg)`,
              transformOrigin: '0px 0px',
              transition: transformTransition,
            }}
          >
            {/* The piece path - UNROTATED coordinates */}
            <path
              d={svgPath}
              fill={piece.color}
              stroke={isSelected ? '#6949FF' : 'rgba(255,255,255,0.2)'}
              strokeWidth={isSelected ? '2' : '1'}
              style={{
                pointerEvents: disabled ? 'none' : 'auto',
                cursor: disabled ? 'default' : isDraggingRef.current ? 'grabbing' : 'crosshair',
                filter: isSelected ? 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.15))' : 'none',
                touchAction: 'none',
              }}
              onPointerDown={disabled ? undefined : handlePointerDown}
              onClick={(e) => e.stopPropagation()}
            />

            {showPulse && (
              <path
                d={svgPath}
                fill={piece.color}
                opacity="0.95"
                className="animate-successPulse"
                style={{
                  pointerEvents: 'none',
                }}
              />
            )}
          </g>
        </g>
      </svg>

      {/* Orbital helper positioned at STABLE center */}
      {isSelected && !disabled && (
        <div
          className="absolute"
          style={{
            left: `${leftPercent}%`,
            top: `${topPercent}%`,
            transform: 'translate(-50%, -50%)',
            transition: positionTransition,
            zIndex: 99999,
            pointerEvents: 'none',
          }}
        >
          <OrbitalHelper
            x={0}
            y={0}
            show={true}
            onRotateLeft={onRotateLeft}
            onRotateRight={onRotateRight}
            rotation={piece.transform.rotation}
            orbitRadius={orbitalRadius}
            onRotateDrag={handleContinuousRotate}
            onRotateEnd={handleContinuousRotateEnd}
          />
        </div>
      )}
    </>
  )
}
