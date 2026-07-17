'use client'

import { CellState, CellPosition, GridSize } from '@shared/lib/nonogram/types'
import { NonogramCell } from './NonogramCell'
import { useCallback } from 'react'

interface NonogramBoardProps {
  grid: CellState[][]
  size: GridSize
  selectedCell: CellPosition | null
  onCellClick: (position: CellPosition) => void
  onDragStart?: (position: CellPosition) => void
  onDragEnter?: (position: CellPosition) => void
  onDragEnd?: () => void
  isDragging?: boolean
  mobile?: boolean
}

export function NonogramBoard({
  grid,
  size,
  selectedCell,
  onCellClick,
  onDragStart,
  onDragEnter,
  onDragEnd,
  isDragging = false,
  mobile = false,
}: NonogramBoardProps) {
  const cellSize = mobile ? 24 : 32

  // Global pointer up handler
  const handlePointerUp = useCallback(() => {
    if (isDragging && onDragEnd) {
      onDragEnd()
    }
  }, [isDragging, onDragEnd])

  return (
    <div
      className="inline-grid bg-white dark:bg-[#181A20]"
      style={{
        gridTemplateColumns: `repeat(${size}, ${cellSize}px)`,
        border: '3px solid #2B2F3A',
        touchAction: 'none', // Prevent scrolling during drag
      }}
      role="grid"
      aria-label="Nonogram board"
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {grid.map((row, rowIndex) =>
        row.map((cellState, colIndex) => {
          const position: CellPosition = { row: rowIndex, col: colIndex }
          const isSelected =
            selectedCell?.row === rowIndex && selectedCell?.col === colIndex

          return (
            <NonogramCell
              key={`${rowIndex}-${colIndex}`}
              state={cellState}
              position={position}
              isSelected={isSelected}
              isMobile={mobile}
              onClick={onCellClick}
              onDragStart={onDragStart}
              onDragEnter={onDragEnter}
              isDragging={isDragging}
            />
          )
        })
      )}
    </div>
  )
}
