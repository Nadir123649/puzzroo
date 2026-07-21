'use client'

import React, { useState, useEffect } from 'react'
import { Square } from '@/lib/chess/chessEngine'
import { PieceColor, PieceType } from '@/utils/chess'
import { SvgChessPiece, PieceThemeConfig, PIECE_THEMES } from './SvgChessPiece'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

const PIECE_OPTIONS: PieceType[] = ['queen', 'rook', 'bishop', 'knight']
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

interface PromotionSelectorProps {
  toSquare: Square
  color: PieceColor
  pieceTheme?: PieceThemeConfig
  customWhiteColor?: string
  customBlackColor?: string
  isMounted: boolean
  isFlipped?: boolean
  onSelect: (piece: PieceType) => void
  onCancel?: () => void
}

export function PromotionSelector({
  toSquare,
  color,
  pieceTheme = PIECE_THEMES.classic,
  customWhiteColor,
  customBlackColor,
  isMounted,
  isFlipped = false,
  onSelect,
  onCancel,
}: PromotionSelectorProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isMounted) {
      const timer = setTimeout(() => setVisible(true), 15)
      return () => clearTimeout(timer)
    }
  }, [isMounted])

  if (!isMounted) return null

  // File col index (0 to 7)
  let colIndex = FILES.indexOf(toSquare[0])
  if (colIndex === -1) colIndex = 0

  // If board is flipped, invert colIndex
  if (isFlipped) {
    colIndex = 7 - colIndex
  }

  // Rank (1 to 8)
  const isTopRank = isFlipped ? toSquare[1] === '1' : toSquare[1] === '8'

  // Shift horizontal placement if near edge (col 5, 6, 7)
  let leftPercent = colIndex * 12.5
  if (colIndex > 4) {
    leftPercent = Math.max(0, leftPercent - 25)
  }

  return (
    <div
      style={{
        left: `${leftPercent}%`,
        top: isTopRank ? '0%' : 'auto',
        bottom: isTopRank ? 'auto' : '0%',
      }}
      className={cn(
        'absolute z-40 transition-all duration-200 p-1 flex flex-col items-center select-none pointer-events-auto',
        visible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
      )}
    >
      <div className="relative flex flex-col items-center bg-white dark:bg-[#1F222A] border-2 border-[#6949FF] rounded-2xl shadow-2xl p-2 gap-1.5">
        {/* Header with Title & Cancel (X) Button */}
        <div className="w-full flex items-center justify-between pb-1.5 border-b border-gray-200 dark:border-gray-800 px-1 gap-3">
          <span className="text-[11px] font-urbanist font-extrabold text-[#6949FF] dark:text-purple-400">
            Promote Pawn
          </span>
          {onCancel && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCancel()
              }}
              className="w-5 h-5 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition-transform active:scale-90 cursor-pointer"
              title="Cancel Promotion"
            >
              <X size={12} strokeWidth={3} />
            </button>
          )}
        </div>

        {/* Piece Selection Buttons */}
        <div className="flex flex-row items-center gap-1 sm:gap-1.5">
          {PIECE_OPTIONS.map((pType) => (
            <button
              key={pType}
              onClick={(e) => {
                e.stopPropagation()
                onSelect(pType)
              }}
              className="flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl hover:bg-[#6949FF]/15 dark:hover:bg-[#6949FF]/25 border border-transparent hover:border-[#6949FF]/40 transition-all duration-150 active:scale-95 cursor-pointer group"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 transition-transform group-hover:scale-110">
                <SvgChessPiece
                  type={pType}
                  color={color}
                  theme={pieceTheme}
                  customWhiteColor={customWhiteColor}
                  customBlackColor={customBlackColor}
                />
              </div>
              <span className="text-[10px] font-urbanist font-extrabold capitalize mt-0.5 text-[#212121] dark:text-[#FAFAFA]">
                {pType}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PromotionSelector
