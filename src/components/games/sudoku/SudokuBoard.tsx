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

  /**
   * Determines if a cell is a source of conflict for a currently incorrect cell
   * Returns true if this cell has a value that matches an error cell in the same row/column/box
   */
  const isConflictSource = (row: number, col: number): boolean => {
    const cell = board[row][col]
    
    // Only cells with values (that are not themselves errors) can be conflict sources
    if (!cell.value || cell.isError) {
      return false
    }
    
    const cellValue = cell.value
    const cellBoxRow = Math.floor(row / 3)
    const cellBoxCol = Math.floor(col / 3)
    
    // Scan entire board for error cells
    for (let errorRow = 0; errorRow < 9; errorRow++) {
      for (let errorCol = 0; errorCol < 9; errorCol++) {
        // Skip the current cell
        if (errorRow === row && errorCol === col) {
          continue
        }
        
        const errorCell = board[errorRow][errorCol]
        
        // Is this cell an error with the same value?
        if (!errorCell.isError || errorCell.value !== cellValue) {
          continue
        }
        
        // Check if error is in same row, column, or 3x3 box
        const inSameRow = errorRow === row
        const inSameCol = errorCol === col
        
        const errorBoxRow = Math.floor(errorRow / 3)
        const errorBoxCol = Math.floor(errorCol / 3)
        const inSameBox = (errorBoxRow === cellBoxRow && errorBoxCol === cellBoxCol)
        
        if (inSameRow || inSameCol || inSameBox) {
          return true
        }
      }
    }
    
    return false
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
          
          // Use purple highlight for either the matching selected number or a conflict source
          const isConflict = isConflictSource(rowIndex, colIndex)
          const hasNumberHighlight = hasSelectedNumberHighlight(rowIndex, colIndex) || isConflict

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
