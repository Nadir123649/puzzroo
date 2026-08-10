'use client'

import React from 'react'
import { SudokuCell as SudokuCellType, Position } from '@shared/lib/sudoku/types'

interface SudokuCellProps {
  cell: SudokuCellType
  position: Position
  isSelected: boolean
  isHighlighted: boolean
  hasSelectedNumberHighlight: boolean
  isMobile?: boolean
  onClick: (position: Position) => void
}

function SudokuCellComponent({
  cell,
  position,
  isSelected,
  isHighlighted,
  hasSelectedNumberHighlight,
  isMobile = false,
  onClick,
}: SudokuCellProps) {
  const isRightBorder = (position.col + 1) % 3 === 0 && position.col !== 8
  const isBottomBorder = (position.row + 1) % 3 === 0 && position.row !== 8

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onClick(position)
  }

  // Build className string for consistent SSR/Client rendering
  let bgClass = ''
  if (cell.isError) {
    bgClass = '!bg-[#F75555] hover:!bg-[#F75555]'
  } else if (isSelected) {
    // Selected state takes priority - show selection even on correct cells
    bgClass = 'bg-[#A592FF] ring-2 ring-[var(--color-primary)] ring-inset'
  } else if (hasSelectedNumberHighlight) {
    // Matching number or conflict source - dark purple highlight
    bgClass = 'bg-[#A592FF]'
  } else if (cell.isCorrect) {
    // Correct cell (not selected, not highlighted) - light purple tint
    bgClass = 'bg-[#E8DFFF] hover:bg-[#D4C5FF]'
  } else if (isHighlighted) {
    bgClass = 'bg-[#F0EDFF] dark:bg-[#35383F]'
  } else {
    bgClass = 'bg-transparent hover:bg-[#E8DFFF] dark:hover:bg-[#2A2D35]'
  }

  const textColorClass = cell.fixed
    ? 'text-[#C3B6FF] dark:text-[#C3B6FF]'
    : 'text-[#212121] dark:text-[#212121]'

  const textSizeClass = isMobile ? 'text-[24px]' : 'text-[36.4px]'
  const borderRightClass = isRightBorder ? 'border-r-[3.03px]' : ''
  const borderBottomClass = isBottomBorder ? 'border-b-[3.03px]' : ''

  return (
    <button
      onClick={handleClick}
      onMouseDown={(e) => e.preventDefault()}
      className={`
        w-full h-full
        flex items-center justify-center
        border-[1.52px] border-[#424242] dark:border-[#FAFAFA]
        font-urbanist font-bold ${textSizeClass} leading-[120%]
        transition-colors duration-150
        relative
        ${textColorClass}
        ${bgClass}
        ${borderRightClass}
        ${borderBottomClass}
        cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]
      `}
      aria-label={`Cell ${position.row + 1}, ${position.col + 1}${
        cell.value ? `, value ${cell.value}` : ', empty'
      }${cell.fixed ? ', fixed' : ''}`}
      tabIndex={-1}
      suppressHydrationWarning
    >
      {cell.value && typeof cell.value === 'number' && cell.value >= 1 && cell.value <= 9 ? (
        <span className="relative z-[1]">{cell.value}</span>
      ) : null}
      {!cell.value && cell.notes && cell.notes.length > 0 && (
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0 p-1 pointer-events-none z-[1]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <div
              key={num}
              className={`flex items-center justify-center font-urbanist ${
                isMobile ? 'text-[8px]' : 'text-[10px]'
              } ${
                cell.notes?.includes(num)
                  ? 'text-[#616161] dark:text-[#616161]'
                  : 'opacity-0'
              }`}
            >
              {cell.notes?.includes(num) ? num : ''}
            </div>
          ))}
        </div>
      )}
    </button>
  )
}

export const SudokuCell = React.memo(SudokuCellComponent, (prev, next) => {
  return prev.position.row === next.position.row
    && prev.position.col === next.position.col
    && prev.isSelected === next.isSelected
    && prev.isHighlighted === next.isHighlighted
    && prev.hasSelectedNumberHighlight === next.hasSelectedNumberHighlight
    && prev.isMobile === next.isMobile
    && prev.cell.value === next.cell.value
    && prev.cell.fixed === next.cell.fixed
    && prev.cell.isError === next.cell.isError
    && prev.cell.isCorrect === next.cell.isCorrect
    && (prev.cell.notes ?? []).join(',') === (next.cell.notes ?? []).join(',')
})
