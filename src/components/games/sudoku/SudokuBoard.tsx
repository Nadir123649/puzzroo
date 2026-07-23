'use client'

import { SudokuBoard as SudokuBoardType, Position } from '@shared/lib/sudoku/types'
import { SudokuCell } from './SudokuCell'

interface SudokuBoardProps {
  board: SudokuBoardType
  selectedCell: Position | null
  selectedNumber: number | null
  onCellClick: (position: Position) => void
  mobile?: boolean
}

export function SudokuBoard({
  board,
  selectedCell,
  selectedNumber,
  onCellClick,
  mobile = false,
}: SudokuBoardProps) {
  /**
   * Determines if a cell should be highlighted
   * (same row, column, or 3x3 box as selected cell, or same number)
   */
  const isCellHighlighted = (row: number, col: number): boolean => {
    if (!selectedCell) return false

    // Don't highlight the selected cell itself
    if (row === selectedCell.row && col === selectedCell.col) return false

    // Same row or column
    if (row === selectedCell.row || col === selectedCell.col) return true

    // Same 3x3 box
    const boxRow = Math.floor(row / 3)
    const boxCol = Math.floor(col / 3)
    const selectedBoxRow = Math.floor(selectedCell.row / 3)
    const selectedBoxCol = Math.floor(selectedCell.col / 3)
    if (boxRow === selectedBoxRow && boxCol === selectedBoxCol) return true

    return false
  }

  /**
   * Determines if a cell should have the selected number highlight (purple)
   */
  const hasSelectedNumberHighlight = (row: number, col: number): boolean => {
    if (!selectedNumber) return false
    
    // Don't highlight the selected cell itself
    if (selectedCell && row === selectedCell.row && col === selectedCell.col) return false
    
    // Highlight if cell has the same number as selected
    return board[row][col].value === selectedNumber
  }

  return (
    <div
      className={`grid grid-cols-9 ${
        mobile ? 'w-full' : 'w-[457.5px]'
      } aspect-square border-[3.03px] border-[#212121] dark:border-[#FAFAFA]`}
      style={{
        gridTemplateRows: 'repeat(9, 1fr)',
      }}
      role="grid"
      aria-label="Sudoku board"
    >
      {board.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          const position: Position = { row: rowIndex, col: colIndex }
          const isSelected =
            selectedCell?.row === rowIndex && selectedCell?.col === colIndex
          const isHighlighted = isCellHighlighted(rowIndex, colIndex)
          const hasNumberHighlight = hasSelectedNumberHighlight(rowIndex, colIndex)

          return (
            <SudokuCell
              key={`${rowIndex}-${colIndex}`}
              cell={cell}
              position={position}
              isSelected={isSelected}
              isHighlighted={isHighlighted}
              hasSelectedNumberHighlight={hasNumberHighlight}
              isMobile={mobile}
              onClick={onCellClick}
            />
          )
        })
      )}
    </div>
  )
}
