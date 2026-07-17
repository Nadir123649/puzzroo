'use client'

import { CellState, CellPosition } from '@shared/lib/nonogram/types'
import { shouldHaveThickBorder } from '@shared/lib/nonogram/helpers'
import { useCallback, useState, useEffect } from 'react'
import { Flag } from 'lucide-react'

interface NonogramCellProps {
  state: CellState
  position: CellPosition
  isSelected: boolean
  isPreview?: boolean
  previewMode?: 'fill' | 'mark' // Which mode is active during preview
  isMobile?: boolean
  onClick: (position: CellPosition) => void
  onDragStart?: (position: CellPosition) => void
  onDragEnter?: (position: CellPosition) => void
  isDragging?: boolean
}

export function NonogramCell({
  state,
  position,
  isSelected,
  isPreview = false,
  previewMode = 'fill',
  isMobile = false,
  onClick,
  onDragStart,
  onDragEnter,
  isDragging = false,
}: NonogramCellProps) {
  const [isFlipping, setIsFlipping] = useState(false)
  const [isShaking, setIsShaking] = useState(false)
  const [prevState, setPrevState] = useState(state)
  const [displayState, setDisplayState] = useState(state)

  // Trigger flip animation when state changes
  useEffect(() => {
    if (state !== prevState && !isPreview) {
      // Start flip animation
      setIsFlipping(true)
      
      // Change display state at middle of flip (when card is rotated 90deg)
      const midFlipTimer = setTimeout(() => {
        setDisplayState(state)
      }, 150) // Half of 300ms animation
      
      // End flip animation
      const endFlipTimer = setTimeout(() => {
        setIsFlipping(false)
        setPrevState(state)
        
        // Check if this is an error state to trigger shake
        if (state === 'error') {
          setIsShaking(true)
          setTimeout(() => setIsShaking(false), 500)
        }
      }, 300)
      
      return () => {
        clearTimeout(midFlipTimer)
        clearTimeout(endFlipTimer)
      }
    } else if (!isPreview) {
      setDisplayState(state)
      setPrevState(state)
    }
  }, [state, prevState, isPreview])

  const handleClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragging) {
      onClick(position)
    }
  }, [isDragging, onClick, position])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    if (onDragStart) {
      onDragStart(position)
    }
  }, [onDragStart, position])

  const handlePointerEnter = useCallback((e: React.PointerEvent) => {
    // Only trigger if pointer is down (dragging)
    if (e.buttons === 1 && onDragEnter) {
      onDragEnter(position)
    }
  }, [onDragEnter, position])

  // Check if this cell should have thick borders (5x5 grouping)
  const hasThickRight = shouldHaveThickBorder(position.col + 1, 5)
  const hasThickBottom = shouldHaveThickBorder(position.row + 1, 5)

  // Background color based on state
  let bgClass = ''
  let borderClass = ''
  
  if (isPreview) {
    // Light purple preview during drag
    bgClass = 'bg-[#A592FF] dark:bg-[#7C6BAE]'
  } else if (displayState === 'error' || isShaking) {
    bgClass = 'bg-white dark:bg-[#181A20]'
    borderClass = 'ring-2 ring-red-500 ring-inset'
  } else if (displayState === 'filled') {
    bgClass = 'bg-[#000000] dark:bg-[#0A0A0A]' // True black for puzzle reveal
  } else if (displayState === 'marked') {
    bgClass = 'bg-white dark:bg-[#181A20]'
  } else if (isSelected) {
    bgClass = 'bg-[#E8DFFF] dark:bg-[#3D2F7A]' // Light purple selection
  } else {
    bgClass = 'bg-white dark:bg-[#181A20] hover:bg-[#F5F6FA] dark:hover:bg-[#2A2D35]'
  }

  const cellSize = isMobile ? 24 : 32

  return (
    <button
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerEnter={handlePointerEnter}
      className={`
        relative
        flex items-center justify-center
        ${bgClass}
        ${borderClass}
        border-[1px] border-[#D0D3DC] dark:border-[#424242]
        ${hasThickRight ? 'border-r-[3px] border-r-[#2B2F3A] dark:border-r-[#FAFAFA]' : ''}
        ${hasThickBottom ? 'border-b-[3px] border-b-[#2B2F3A] dark:border-b-[#FAFAFA]' : ''}
        transition-colors duration-150
        cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-[#6949FF]
        select-none
        ${isFlipping ? 'cell-flip' : ''}
        ${isShaking ? 'cell-shake' : ''}
      `}
      style={{
        width: `${cellSize}px`,
        height: `${cellSize}px`,
        touchAction: 'none',
        transformStyle: 'preserve-3d',
        perspective: '1000px',
      }}
      aria-label={`Cell ${position.row + 1}, ${position.col + 1}, ${displayState}`}
      tabIndex={-1}
      suppressHydrationWarning
    >
      {/* Red Flag icon for 'marked' state OR preview in mark mode */}
      {((displayState === 'marked' && !isPreview) || (isPreview && previewMode === 'mark')) && (
        <Flag 
          size={cellSize * 0.5} 
          className="pointer-events-none text-[#EF4444]"
          fill="#EF4444"
        />
      )}

      {/* Red X mark for 'error' state */}
      {(displayState === 'error' || isShaking) && !isPreview && (
        <svg
          width={cellSize * 0.5}
          height={cellSize * 0.5}
          viewBox="0 0 16 16"
          fill="none"
          className="pointer-events-none"
        >
          <path
            d="M2 2L14 14M14 2L2 14"
            stroke="#EF4444"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  )
}
