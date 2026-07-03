'use client'

import React, { useRef, useState } from 'react'
import { TangramPiece as TangramPieceType } from '@/types/tangram'
import { OrbitalHelper } from './OrbitalHelper'
import { PIECE_CONFIG } from '@/lib/tangram/pieceConfig'
import { snapToPieces, snapToSquareEdge } from '@/lib/tangram/snapping'
import { SQUARE_SOLUTION } from '@/lib/tangram/squareSolution'
import {
  BOARD_VIRTUAL_HEIGHT,
  BOARD_VIRTUAL_WIDTH,
} from '@/lib/tangram/boardConfig'

const VIRTUAL_W = BOARD_VIRTUAL_WIDTH
const VIRTUAL_H = BOARD_VIRTUAL_HEIGHT
const SNAP_THRESHOLD = 25 // px in virtual coords

interface TangramPieceProps {
  piece: TangramPieceType
  isSelected: boolean
  onSelect: () => void
  onMove: (x: number, y: number) => void
  onRotateLeft: () => void
  onRotateRight: () => void
  isInTray?: boolean
  solutionPosition?: { x: number; y: number; rotation: number }
  onSnapToSolution?: (x: number, y: number, rotation: number) => void
  boardContainerWidth?: number // actual rendered px width of the board container
  allPieces?: TangramPieceType[]
}

export function TangramPiece({
  piece,
  isSelected,
  onSelect,
  onMove,
  onRotateLeft,
  onRotateRight,
  isInTray = false,
  solutionPosition,
  onSnapToSolution,
  boardContainerWidth,
  allPieces,
}: TangramPieceProps) {
  const dragStartPos = useRef<{ x: number; y: number } | null>(null)
  const pieceStartPos = useRef<{ x: number; y: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isSnapping, setIsSnapping] = useState(false)
  const [showPulse, setShowPulse] = useState(false)

  const config = PIECE_CONFIG[piece.type]
  const displayWidth = config.displayWidth
  const displayHeight = config.displayHeight

  // ── Clamp helpers ──────────────────────────────────────────────────────────
  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, val))

  const clampPosition = (x: number, y: number) => ({
    x: clamp(x, 0, VIRTUAL_W - displayWidth),
    y: clamp(y, 0, VIRTUAL_H - displayHeight),
  })

  // ── Snapping Priority Check ────────────────────────────────────────────────
  const trySnap = (x: number, y: number) => {
    // 1. Exact solution slot (snaps to correct position AND automatically rotates to correct angle)
    if (onSnapToSolution) {
      // Find candidate solution slots for this piece type
      const slots: { x: number; y: number; rotation: number }[] = []
      const type = piece.type
      if (type === 'large-triangle-1' || type === 'large-triangle-2') {
        slots.push(SQUARE_SOLUTION['large-triangle-1'])
        slots.push(SQUARE_SOLUTION['large-triangle-2'])
      } else if (type === 'small-triangle-1' || type === 'small-triangle-2') {
        slots.push(SQUARE_SOLUTION['small-triangle-1'])
        slots.push(SQUARE_SOLUTION['small-triangle-2'])
      } else if (solutionPosition) {
        slots.push(solutionPosition)
      }

      for (const slot of slots) {
        const dx = x - slot.x
        const dy = y - slot.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        
        if (dist < SNAP_THRESHOLD) {
          setIsSnapping(true)
          
          // Auto-rotate: Snap rotation to target solution rotation!
          onSnapToSolution(slot.x, slot.y, slot.rotation)
          
          // Trigger success pulse glowing animation
          setShowPulse(true)
          setTimeout(() => setShowPulse(false), 850)

          setTimeout(() => setIsSnapping(false), 350)
          return true
        }
      }
    }

    // 2. Piece-to-piece snapping
    if (allPieces) {
      const pieceSnap = snapToPieces(piece.type, x, y, piece.position.rotation, piece.id, allPieces)
      if (pieceSnap.snapped) {
        onMove(pieceSnap.x, pieceSnap.y)
        return true
      }
    }

    // 3. Board-edge/Square-edge snapping
    const edgeSnap = snapToSquareEdge(piece.type, x, y, piece.position.rotation)
    if (edgeSnap.snapped) {
      onMove(edgeSnap.x, edgeSnap.y)
      return true
    }

    return false
  }

  // ── Mouse drag ─────────────────────────────────────────────────────────────
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    onSelect()

    const boardElement = e.currentTarget.closest('.tangram-board-container')
    if (!boardElement) return

    const boardRect = boardElement.getBoundingClientRect()

    dragStartPos.current = { x: e.clientX, y: e.clientY }
    pieceStartPos.current = { x: piece.position.x, y: piece.position.y }
    setIsDragging(true)

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartPos.current || !pieceStartPos.current) return

      const deltaX = moveEvent.clientX - dragStartPos.current.x
      const deltaY = moveEvent.clientY - dragStartPos.current.y

      const scaleX = VIRTUAL_W / boardRect.width
      const scaleY = VIRTUAL_H / boardRect.height
      const rawX = pieceStartPos.current.x + deltaX * scaleX
      const rawY = pieceStartPos.current.y + deltaY * scaleY
      const { x, y } = clampPosition(rawX, rawY)

      if (!trySnap(x, y)) {
        onMove(x, y)
      }
    }

    const handleMouseUp = () => {
      dragStartPos.current = null
      pieceStartPos.current = null
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  // ── Touch drag ─────────────────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()

    onSelect()

    const boardElement = e.currentTarget.closest('.tangram-board-container')
    if (!boardElement) return

    const boardRect = boardElement.getBoundingClientRect()

    const touch = e.touches[0]
    dragStartPos.current = { x: touch.clientX, y: touch.clientY }
    pieceStartPos.current = { x: piece.position.x, y: piece.position.y }
    setIsDragging(true)

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (!dragStartPos.current || !pieceStartPos.current) return
      const t = moveEvent.touches[0]
      const deltaX = t.clientX - dragStartPos.current.x
      const deltaY = t.clientY - dragStartPos.current.y

      const scaleX = VIRTUAL_W / boardRect.width
      const scaleY = VIRTUAL_H / boardRect.height
      const rawX = pieceStartPos.current.x + deltaX * scaleX
      const rawY = pieceStartPos.current.y + deltaY * scaleY
      const { x, y } = clampPosition(rawX, rawY)

      if (!trySnap(x, y)) {
        onMove(x, y)
      }
    }

    const handleTouchEnd = () => {
      dragStartPos.current = null
      pieceStartPos.current = null
      setIsDragging(false)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }

    document.addEventListener('touchmove', handleTouchMove)
    document.addEventListener('touchend', handleTouchEnd)
  }

  // ── Layout calculations ────────────────────────────────────────────────────
  const constrainedX = clamp(piece.position.x, 0, VIRTUAL_W - displayWidth)
  const constrainedY = clamp(piece.position.y, 0, VIRTUAL_H - displayHeight)

  const widthPercent = (displayWidth / VIRTUAL_W) * 100
  const heightPercent = (displayHeight / VIRTUAL_H) * 100
  const leftPercent = (constrainedX / VIRTUAL_W) * 100
  const topPercent = (constrainedY / VIRTUAL_H) * 100

  // Transition: smooth when not dragging, instant when dragging
  const isAnimating = !isDragging
  const positionTransition = isAnimating
    ? 'left 0.8s cubic-bezier(0.25, 1, 0.5, 1), top 0.8s cubic-bezier(0.25, 1, 0.5, 1)'
    : 'none'
  const rotationTransition = isAnimating
    ? 'transform 0.8s cubic-bezier(0.25, 1, 0.5, 1)'
    : 'none'

  // ── OrbitalHelper ring size based on board width ───────────────────────────
  // boardContainerWidth is the actual rendered container width in CSS px
  // Virtual coords are 750 wide, so we scale orbital radius accordingly
  const orbitalBoardWidth = boardContainerWidth ?? VIRTUAL_W
  let orbitalRadius = 85
  if (orbitalBoardWidth < 450) orbitalRadius = 60
  else if (orbitalBoardWidth < 700) orbitalRadius = 72

  return (
    <div
      className={`absolute ${isSelected ? 'z-50' : 'z-10'}`}
      style={{
        left: `${leftPercent}%`,
        top: `${topPercent}%`,
        width: `${widthPercent}%`,
        height: `${heightPercent}%`,
        transition: positionTransition,
      }}
    >
      {/* Shape SVG — rotates and is draggable. Pulse overlay lives INSIDE here so it inherits the same rotation */}
      <div
        className="absolute inset-0 cursor-move"
        style={{
          transform: `rotate(${piece.position.rotation}deg)`,
          transition: rotationTransition,
          overflow: 'visible',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${displayWidth} ${displayHeight}`}
        >
          <path
            d={config.svgPath}
            fill={piece.color}
            stroke={isSelected ? '#6949FF' : 'rgba(255,255,255,0.2)'}
            strokeWidth={isSelected ? '2' : '1'}
          />
        </svg>

        {/* Success Pulse — inside rotated div → inherits exact shape orientation automatically */}
        {showPulse && (
          <div
            className="absolute inset-0 pointer-events-none animate-successPulse"
            style={{
              zIndex: 100,
              overflow: 'visible',
            }}
          >
            <svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${displayWidth} ${displayHeight}`}
              style={{ overflow: 'visible' }}
            >
              <defs>
                <filter
                  id={`pulse-glow-${piece.id}`}
                  x="-80%"
                  y="-80%"
                  width="260%"
                  height="260%"
                >
                  <feDropShadow
                    dx="0"
                    dy="0"
                    stdDeviation="12"
                    floodColor={piece.color}
                    floodOpacity="1"
                  />
                </filter>
              </defs>
              <path
                d={config.svgPath}
                fill={piece.color}
                opacity="0.95"
                filter={`url(#pulse-glow-${piece.id})`}
              />
            </svg>
          </div>
        )}
      </div>

      {/* Orbital helper — FIXED, does NOT rotate with shape */}
      {isSelected && (
        <OrbitalHelper
          x="50%"
          y="50%"
          show={true}
          onRotateLeft={onRotateLeft}
          onRotateRight={onRotateRight}
          rotation={piece.position.rotation}
          orbitRadius={orbitalRadius}
        />
      )}
    </div>
  )
}
