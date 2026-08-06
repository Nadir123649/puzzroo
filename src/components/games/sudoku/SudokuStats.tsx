/**
 * Sudoku Stats Component
 * Displays game statistics (Mistakes, Score, Time)
 */

'use client'

import React from 'react'

interface SudokuStatsProps {
  mistakes: number
  maxMistakes: number
  score: number
  time: number
  mobile?: boolean
}

export function SudokuStats({
  mistakes,
  maxMistakes,
  score,
  time,
  mobile = false,
}: SudokuStatsProps) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  if (mobile) {
    return (
      <div className="w-full flex justify-between items-center">
        <span className="font-urbanist font-semibold text-[16px] leading-[140%] tracking-[0.2px] text-[#424242] dark:text-[#E0E0E0]">
          Mistakes: <span className="text-[var(--color-primary)]" style={{ fontVariantNumeric: 'tabular-nums' }}>{mistakes}/{maxMistakes}</span>
        </span>
        <span className="font-urbanist font-semibold text-[16px] leading-[140%] tracking-[0.2px] text-[#424242] dark:text-[#E0E0E0]">
          Score: <span className={`inline-block min-w-[2.5ch] ${score < 0 ? 'text-[#EF4444] dark:text-[#FF6B6B]' : 'text-[var(--color-primary)]'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{score}</span>
        </span>
        <span className="font-urbanist font-semibold text-[16px] leading-[140%] tracking-[0.2px] text-[#424242] dark:text-[#E0E0E0]">
          Time: <span className="text-[var(--color-primary)] inline-block min-w-[5ch]" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatTime(time)}</span>
        </span>
      </div>
    )
  }

  return (
    <div className="w-[230px] flex flex-col gap-[12px]">
      {/* Score - centered with stable width */}
      <div className="text-center">
        <span className="font-urbanist font-semibold text-[24px] leading-[140%] tracking-[0.2px] text-[#424242] dark:text-[#E0E0E0]">
          Score: <span className={`inline-block min-w-[3ch] ${score < 0 ? 'text-[#EF4444] dark:text-[#FF6B6B]' : 'text-[var(--color-primary)]'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>{score}</span>
        </span>
      </div>

      {/* Mistakes and Time with stable widths */}
      <div className="flex justify-between items-center">
        <span className="font-urbanist font-semibold text-[16px] leading-[140%] tracking-[0.2px] text-[#424242] dark:text-[#E0E0E0]">
          Mistakes: <span className="text-[var(--color-primary)]" style={{ fontVariantNumeric: 'tabular-nums' }}>{mistakes}/{maxMistakes}</span>
        </span>
        <span className="font-urbanist font-semibold text-[16px] leading-[140%] tracking-[0.2px] text-[#424242] dark:text-[#E0E0E0]">
          Time: <span className="text-[var(--color-primary)] inline-block min-w-[5ch]" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatTime(time)}</span>
        </span>
      </div>
    </div>
  )
}
