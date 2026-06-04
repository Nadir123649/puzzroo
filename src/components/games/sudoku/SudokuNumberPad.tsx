/**
 * Sudoku Number Pad Component
 * 1-9 number selection buttons
 */

'use client'

import React from 'react'

interface SudokuNumberPadProps {
  selectedNumber: number | null
  onNumberSelect: (num: number) => void
  mobile?: boolean
}

export function SudokuNumberPad({
  selectedNumber,
  onNumberSelect,
  mobile = false,
}: SudokuNumberPadProps) {
  if (mobile) {
    return (
      <div className="flex justify-between items-center gap-[6px] w-full max-w-[350px] px-2">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => onNumberSelect(num)}
            className={`
              w-[32px] h-[40px] rounded-[2.51px] 
              font-urbanist font-bold text-[18px] leading-[120%] 
              flex items-center justify-center transition-all duration-300
              ${
                selectedNumber === num
                  ? 'bg-[#A592FF] text-white'
                  : 'bg-[#F5F5F5] dark:bg-[#1F222A] text-[#424242] dark:text-[#F5F5F5] hover:bg-[#A592FF] hover:text-white'
              }
            `}
            aria-label={`Number ${num}`}
            aria-pressed={selectedNumber === num}
          >
            {num}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-[8.07px] w-[230px]">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
        <button
          key={num}
          onClick={() => onNumberSelect(num)}
          className={`
            w-[71.09px] h-[71.09px] rounded-[5.33px] 
            font-urbanist font-bold text-[42.65px] leading-[120%] 
            flex items-center justify-center transition-all duration-200
            ${
              selectedNumber === num
                ? 'bg-[#A592FF] text-white'
                : 'bg-[#F5F5F5] dark:bg-[#1F222A] text-[#424242] dark:text-[#F5F5F5] hover:bg-[#EEEEEE] dark:hover:bg-[#2A2D35]'
            }
          `}
          aria-label={`Number ${num}`}
          aria-pressed={selectedNumber === num}
        >
          {num}
        </button>
      ))}
    </div>
  )
}
