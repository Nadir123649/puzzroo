/**
 * Orbital Helper Component
 * Premium smooth rotation with Pointer Events
 * Fixed orbital ring - only the piece rotates
 */

'use client'

import React, { useRef, useEffect } from 'react'

interface OrbitalHelperProps {
  x: number | string
  y: number | string
  show: boolean
  onRotateLeft: () => void
  onRotateRight: () => void
  rotation: number
  orbitRadius?: number
  onRotateDrag?: (deltaAngle: number) => void
  onRotateEnd?: () => void
}

export function OrbitalHelper({
  x,
  y,
  show,
  onRotateLeft,
  onRotateRight,
  rotation,
  orbitRadius = 85,
  onRotateDrag,
  onRotateEnd,
}: OrbitalHelperProps) {
  // Use refs only - no state to avoid rerenders during drag
  const isDraggingRef = useRef(false)
  const centerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const dragStartRotationRef = useRef(0)
  const startAngleRef = useRef(0)
  const lastAngleRef = useRef(0)
  const accumulatedDeltaRef = useRef(0)
  const circleRef = useRef<SVGCircleElement>(null)

  // Store callbacks in refs to avoid stale closures
  const onRotateDragRef = useRef(onRotateDrag)
  const onRotateEndRef = useRef(onRotateEnd)
  const onRotateLeftRef = useRef(onRotateLeft)
  const onRotateRightRef = useRef(onRotateRight)

  useEffect(() => {
    onRotateDragRef.current = onRotateDrag
    onRotateEndRef.current = onRotateEnd
    onRotateLeftRef.current = onRotateLeft
    onRotateRightRef.current = onRotateRight
  }, [onRotateDrag, onRotateEnd, onRotateLeft, onRotateRight])

  if (!show) return null

  const getAngle = (clientX: number, clientY: number): number => {
    const dx = clientX - centerRef.current.x
    const dy = clientY - centerRef.current.y
    return Math.atan2(dy, dx) * (180 / Math.PI)
  }

  const normalizeAngleDiff = (diff: number): number => {
    // Normalize to -180 to +180 range
    while (diff > 180) diff -= 360
    while (diff < -180) diff += 360
    return diff
  }

  const handlePointerDown = (e: React.PointerEvent<SVGCircleElement>) => {
    e.stopPropagation()
    e.preventDefault()

    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)

    const rect = target.getBoundingClientRect()
    centerRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }

    const angle = getAngle(e.clientX, e.clientY)
    dragStartRotationRef.current = rotation
    startAngleRef.current = angle
    lastAngleRef.current = angle
    accumulatedDeltaRef.current = 0
    isDraggingRef.current = true
  }

  const handlePointerMove = (e: React.PointerEvent<SVGCircleElement>) => {
    if (!isDraggingRef.current) return

    e.stopPropagation()
    e.preventDefault()

    const newAngle = getAngle(e.clientX, e.clientY)
    const diff = normalizeAngleDiff(newAngle - lastAngleRef.current)

    accumulatedDeltaRef.current += diff
    lastAngleRef.current = newAngle

    const absoluteRotation = dragStartRotationRef.current + accumulatedDeltaRef.current

    if (onRotateDragRef.current) {
      onRotateDragRef.current(absoluteRotation)
    }
  }

  const handlePointerUp = (e: React.PointerEvent<SVGCircleElement>) => {
    if (!isDraggingRef.current) return

    e.stopPropagation()
    e.preventDefault()

    const target = e.currentTarget
    target.releasePointerCapture(e.pointerId)

    isDraggingRef.current = false

    if (onRotateEndRef.current) {
      onRotateEndRef.current()
    }

    // Reset temporary values
    dragStartRotationRef.current = 0
    startAngleRef.current = 0
    lastAngleRef.current = 0
    accumulatedDeltaRef.current = 0
  }

  const handlePointerCancel = (e: React.PointerEvent<SVGCircleElement>) => {
    handlePointerUp(e)
  }

  const handleArrowClick = (e: React.UIEvent, direction: 'left' | 'right') => {
    e.stopPropagation()
    e.preventDefault()

    if (direction === 'left') {
      onRotateLeftRef.current()
    } else {
      onRotateRightRef.current()
    }
  }

  return (
    <div
      className="absolute"
      style={{
        left: typeof x === 'number' ? `${x}px` : x,
        top: typeof y === 'number' ? `${y}px` : y,
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 9999,
        touchAction: 'none',
      }}
    >
      {/* Fixed orbital ring - does NOT rotate */}
      <div
        className="absolute"
        style={{
          width: `${orbitRadius * 2}px`,
          height: `${orbitRadius * 2}px`,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
          touchAction: 'none',
        }}
      >
        {/* Clickable circle BORDER ONLY for rotation */}
        <svg
          width={orbitRadius * 2}
          height={orbitRadius * 2}
          className="absolute inset-0"
          style={{
            overflow: 'visible',
          }}
        >
          <circle
            ref={circleRef}
            cx={orbitRadius}
            cy={orbitRadius}
            r={orbitRadius - 12}
            fill="none"
            stroke="transparent"
            strokeWidth="24"
            style={{
              cursor: isDraggingRef.current ? 'grabbing' : 'grab',
              pointerEvents: 'stroke',
              touchAction: 'none',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          />
        </svg>

        <svg
          width={orbitRadius * 2}
          height={orbitRadius * 2}
          className="absolute inset-0"
          style={{ pointerEvents: 'none' }}
        >
          <defs>
            <filter id="glassBlur">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.15" />
            </filter>
          </defs>

          {/* Single thick grey ring - FIXED, does NOT rotate */}
          <circle
            cx={orbitRadius}
            cy={orbitRadius}
            r={orbitRadius - 12}
            fill="none"
            stroke="#9E9E9E"
            strokeWidth="16"
            opacity="0.7"
            filter="url(#glassBlur)"
          />
        </svg>

        {/* TOP BADGE - Purple with < > arrows - FIXED position */}
        <div
          className="absolute"
          style={{
            left: '50%',
            top: '-5px',
            transform: 'translateX(-50%)',
            zIndex: 101,
            pointerEvents: 'auto',
          }}
        >
          <div className="bg-[#6949FF] rounded-full px-3 py-1.5 flex items-center gap-2 shadow-lg">
            {/* Rotate Left Button */}
            <button
              onPointerDown={(e) => handleArrowClick(e, 'left')}
              className="hover:scale-125 active:scale-95 transition-transform duration-150"
              aria-label="Rotate left"
              style={{ touchAction: 'manipulation' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M8 2 L4 6 L8 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Rotate Right Button */}
            <button
              onPointerDown={(e) => handleArrowClick(e, 'right')}
              className="hover:scale-125 active:scale-95 transition-transform duration-150"
              aria-label="Rotate right"
              style={{ touchAction: 'manipulation' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M4 2 L8 6 L4 10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
