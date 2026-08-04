'use client'

import React from 'react'
import { Cell } from '@shared/lib/crossmath/types'

interface CrossMathCellProps {
  cell: Cell
  isSelected: boolean
  onClick: () => void
  minCellWidth?: number
}

export const CrossMathCell = React.memo(function CrossMathCellComponent({ cell, isSelected, onClick, minCellWidth }: CrossMathCellProps) {
  const isEditable = cell.isEditable
  const isEmpty = cell.type === 'empty'
  const isNumber = cell.type === 'number'
  const isOperator = cell.type === 'operator'

  // Dead cells: non-editable empty cells that aren't part of the pattern
  // Render as fully transparent so the board shape shows clearly
  if (!isEditable && isEmpty && !cell.value) {
    return <div className="aspect-square w-full" aria-hidden="true" />
  }

  // Operator spacer cells (no value)
  if (isOperator && !cell.value) {
    return <div className="aspect-square w-full" aria-hidden="true" />
  }

  // Background colors
  let bgColor = 'bg-white dark:bg-[#262A34]' // Empty editable

  if (isOperator && cell.value) {
    bgColor = 'bg-[#F5F5F5] dark:bg-[#1F222A]' // Operator cells
  } else if (isNumber && !isEditable) {
    bgColor = 'bg-[#E8DFFF] dark:bg-[#2D2640]' // Pre-filled numbers
  } else if (isNumber && isEditable) {
    bgColor = 'bg-white dark:bg-[#262A34]' // User-entered numbers
  }

  // Error state (always red bg/text, even when selected)
  if (cell.isError) {
    bgColor = 'bg-[#FFE8E8] dark:bg-[#3D2020]'
  }

  // Correct state (always green bg/text, even when selected)
  if (cell.isCorrect && isEditable) {
    bgColor = 'bg-[#E8F5E9] dark:bg-[#1B2F1F]'
  }

  // Selected state (purple bg only for cells that are neither error nor correct)
  if (isSelected && isEditable && !cell.isError && !cell.isCorrect) {
    bgColor = 'bg-[#E8DFFF] dark:bg-[#2D2640]'
  }

  // Border - keep consistent width, change color only
  let borderClass = 'border-[2px] border-[#E0E0E0] dark:border-[#35383F]'

  // Error border: red when not selected, purple when selected (selection indicator)
  if (cell.isError) {
    borderClass = isSelected ? 'border-[2px] border-[#6949FF]' : 'border-[2px] border-[#FF6B6B]'
  }

  // Correct border: green when not selected, purple when selected (selection indicator)
  if (cell.isCorrect && isEditable) {
    borderClass = isSelected ? 'border-[2px] border-[#6949FF]' : 'border-[2px] border-[#4CAF50]'
  }

  // Selected border (purple for non-error, non-correct cells)
  if (isSelected && isEditable && !cell.isError && !cell.isCorrect) {
    borderClass = 'border-[2px] border-[#6949FF]'
  }

  // Text color
  let textColor = 'text-[#212121] dark:text-[#FAFAFA]' // Default
  if (isOperator) {
    textColor = 'text-[#757575] dark:text-[#9E9E9E]' // Operators lighter
  }

  // Error text (always red)
  if (cell.isError) {
    textColor = 'text-[#FF6B6B]'
  }

  // Correct text (always green)
  if (cell.isCorrect && isEditable) {
    textColor = 'text-[#4CAF50]'
  }

  // Selected text (purple for non-error, non-correct cells)
  if (isSelected && isEditable && !cell.isError && !cell.isCorrect) {
    textColor = 'text-[#6949FF]'
  }

  // Cursor
  let cursorClass = 'cursor-default'
  if (isEditable && isEmpty || (isEditable && isNumber)) {
    cursorClass = 'cursor-pointer'
  }

  // Hover
  let hoverClass = ''
  if (isEditable) {
    hoverClass = 'hover:bg-[#F0EDFF] dark:hover:bg-[#35383F] transition-colors duration-150'
  }

  return (
    <button
      onClick={isEditable ? onClick : undefined}
      disabled={!isEditable}
      type="button"
      className={`
        aspect-square w-full
        flex items-center justify-center
        rounded-[4px]
        font-urbanist font-bold
        text-[15px] md:text-[20px] lg:text-[22px]
        ${bgColor}
        ${borderClass}
        ${textColor}
        ${cursorClass}
        ${hoverClass}
        focus:outline-none
        transition-all duration-150
        select-none
        ${isEditable ? 'pointer-events-auto' : 'pointer-events-none'}
      `}
      tabIndex={isEditable ? 0 : -1}
      style={minCellWidth ? { minWidth: `${minCellWidth}px`, minHeight: `${minCellWidth}px` } : undefined}
      aria-label={
        isOperator && cell.value
          ? `Operator ${cell.value}`
          : isNumber
          ? `Number ${cell.value}`
          : 'Empty cell'
      }
    >
      {cell.value}
    </button>
  )
})
