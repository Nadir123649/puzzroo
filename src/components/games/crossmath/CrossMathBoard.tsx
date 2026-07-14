'use client'

import React from 'react'
import { Cell } from '@/lib/crossmath/types'
import { CrossMathCell } from './CrossMathCell'

interface CrossMathBoardProps {
  board: Cell[][]
  selectedCell: { row: number; col: number } | null
  onCellClick: (row: number, col: number) => void
  mobile?: boolean
}

export function CrossMathBoard({
  board,
  selectedCell,
  onCellClick,
  mobile = false,
}: CrossMathBoardProps) {
  const rows = board.length
  const cols = board[0]?.length || 0

  return (
    <div
      className={`
        ${mobile ? 'w-full' : 'w-auto'}
        bg-white dark:bg-[#262A34]
        rounded-[12px]
        p-[12px] md:p-[16px]
        border-[1.5px] border-[#E0E0E0] dark:border-[#35383F]
        transition-colors duration-300
      `}
      style={{
        boxShadow: '0px 4px 60px 0px rgba(0, 0, 0, 0.12)',
      }}
    >
      <div
        className="grid gap-[2px] md:gap-[3px] w-full"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => {
            return (
              <CrossMathCell
                key={`${rowIndex}-${colIndex}`}
                cell={cell}
                isSelected={
                  selectedCell?.row === rowIndex &&
                  selectedCell?.col === colIndex
                }
                onClick={() => onCellClick(rowIndex, colIndex)}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
