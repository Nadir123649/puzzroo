'use client'

import { SudokuCell as SudokuCellType, Position } from '@/lib/sudoku/types'

interface SudokuCellProps {
  cell: SudokuCellType
  position: Position
  isSelected: boolean
  isHighlighted: boolean
  hasSelectedNumberHighlight: boolean
  isMobile?: boolean
  onClick: (position: Position) => void
}

export function SudokuCell({
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
  } else if (cell.isCorrect) {
    // Correct cell (not selected) - purple tint
    bgClass = 'bg-[#E8DFFF] hover:bg-[#D4C5FF]'
  } else if (hasSelectedNumberHighlight) {
    bgClass = 'bg-[#A592FF]'
  } else if (isHighlighted) {
    bgClass = 'bg-[#F0EDFF] dark:bg-[#35383F]'
  } else {
    bgClass = 'bg-transparent hover:bg-[#E8DFFF] dark:hover:bg-[#2A2D35]'
  }

  const textColorClass = cell.fixed
    ? 'text-[#C3B6FF] dark:text-[#C3B6FF]'
    : 'text-[#212121] dark:text-[#FAFAFA]'

  const textSizeClass = isMobile ? 'text-[24px]' : 'text-[36.4px]'
  const borderRightClass = isRightBorder ? 'border-r-[3.03px]' : ''
  const borderBottomClass = isBottomBorder ? 'border-b-[3.03px]' : ''

  return (
    <button
      onClick={handleClick}
      onMouseDown={(e) => e.preventDefault()}
      className={`
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
      {cell.value ? cell.value : null}
      {!cell.value && cell.notes && cell.notes.length > 0 && (
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0 p-1 pointer-events-none">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <div
              key={num}
              className={`flex items-center justify-center font-urbanist ${
                isMobile ? 'text-[8px]' : 'text-[10px]'
              } ${
                cell.notes?.includes(num)
                  ? 'text-[#616161] dark:text-[#E0E0E0]'
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
