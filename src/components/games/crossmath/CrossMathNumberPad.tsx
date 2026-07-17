'use client'

import React from 'react'

interface CrossMathNumberPadProps {
  availableNumbers: Set<number>
  onNumberSelect: (num: number) => void
  numbersPerRow: number
  mobile?: boolean
  usedNumbersCount: Map<number, number>
  requiredNumbersCount?: Map<number, number>
}

export function CrossMathNumberPad({
  availableNumbers,
  onNumberSelect,
  numbersPerRow,
  mobile = false,
  usedNumbersCount,
  requiredNumbersCount,
}: CrossMathNumberPadProps) {
  // Convert set to sorted array - these are ALL the numbers that should appear in the solution
  const allNumbers = Array.from(availableNumbers).sort((a, b) => a - b)

  // Split into rows
  const rows: number[][] = []
  for (let i = 0; i < allNumbers.length; i += numbersPerRow) {
    rows.push(allNumbers.slice(i, i + numbersPerRow))
  }

  return (
    <div className="w-full">
      <div className="flex flex-col gap-[12px]">
        {rows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="flex gap-[12px]"
            style={{
              justifyContent: row.length < numbersPerRow ? 'center' : 'stretch',
            }}
          >
            {row.map(num => {
              const usedCount = usedNumbersCount.get(num) || 0
              const requiredCount = requiredNumbersCount?.get(num) || 1
              const isUsed = usedCount >= requiredCount
              
              return (
                <button
                  key={num}
                  onClick={() => onNumberSelect(num)}
                  disabled={isUsed}
                  className={`
                    ${mobile ? 'h-[46px]' : 'h-[46px]'}
                    rounded-[8px]
                    font-urbanist font-bold text-[20px]
                    transition-all duration-200
                    ${
                      isUsed
                        ? 'bg-[#F0EDFF] dark:bg-[#1F222A] text-[#BDBDBD] dark:text-[#616161] opacity-50 cursor-not-allowed'
                        : 'bg-[#F0EDFF] dark:bg-[#1F222A] text-[#212121] dark:text-[#FAFAFA] hover:bg-[#E8DFFF] dark:hover:bg-[#2D2640] active:scale-95 cursor-pointer'
                    }
                  `}
                  style={{
                    width: `calc((100% - ${(numbersPerRow - 1) * 12}px) / ${numbersPerRow})`,
                  }}
                  aria-label={`Number ${num}${isUsed ? ` (used ${usedCount} time${usedCount > 1 ? 's' : ''})` : ''}`}
                >
                  {num}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
