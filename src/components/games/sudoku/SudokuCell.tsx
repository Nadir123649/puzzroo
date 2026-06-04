/**
 * Sudoku Cell Component
 * Individual cell in the Sudoku board
 */

'use client'

import React from 'react'
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

  const handleClick = () => {
    onClick(position)
  }

  return (
    <button
      onClick={handleClick}
      className={`
        flex items-center justify-center
        border-[1.52px] border-[#424242] dark:border-[#FAFAFA]
        font-urbanist font-bold ${isMobile ? 'text-[24px]' : 'text-[36.4px]'} leading-[120%]
        transition-all duration-200
        relative
        ${
          cell.fixed
            ? 'text-[#C3B6FF] dark:text-[#C3B6FF]'
            : 'text-[#424242] dark:text-[#F5F5F5]'
        }
        ${
          cell.isError
            ? 'bg-[#F75555]'
            : isSelected
            ? 'bg-[#A592FF] ring-2 ring-[var(--color-primary)] ring-inset'
            : hasSelectedNumberHighlight
            ? 'bg-[#A592FF]'
            : isHighlighted
            ? 'bg-[#F0EDFF] dark:bg-[#35383F]'
            : 'bg-transparent'
        }
        ${isRightBorder ? 'border-r-[3.03px]' : ''}
        ${isBottomBorder ? 'border-b-[3.03px]' : ''}
        hover:bg-[#E8DFFF] dark:hover:bg-[#2A2D35]
        cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]
      `}
      aria-label={`Cell ${position.row + 1}, ${position.col + 1}${
        cell.value ? `, value ${cell.value}` : ', empty'
      }${cell.fixed ? ', fixed' : ''}`}
      tabIndex={-1}
    >
      {cell.value ? (
        cell.value
      ) : cell.notes && cell.notes.length > 0 ? (
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-0 p-1">
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
      ) : null}
    </button>
  )
}
