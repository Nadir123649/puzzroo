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
    <>
      {/* Full screen transparent backdrop to catch clicks outside the selector card */}
      <div
        className="fixed inset-0 z-40 bg-transparent cursor-default pointer-events-auto"
        onClick={onCancel}
      />

      {/* Promotion Selector card absolutely positioned over the pawn's column */}
      <div
        style={{
          left: `${leftPercent}%`,
          top: isTopRank ? '0%' : 'auto',
          bottom: isTopRank ? 'auto' : '0%',
        }}
        className={cn(
          'absolute z-50 transition-all duration-200 p-1 flex flex-col items-center select-none pointer-events-auto',
          visible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex flex-col items-center bg-white/80 dark:bg-[#1F222A]/85 backdrop-blur-md border-2 border-[#6949FF] rounded-2xl shadow-2xl p-2 gap-1.5">
          {/* Close (X) button in top-right corner */}
          {onCancel && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onCancel()
              }}
              className="absolute top-1.5 right-1.5 text-[#757575] hover:text-[#212121] dark:text-[#BDBDBD] dark:hover:text-white p-0.5 rounded-full hover:bg-gray-100 dark:hover:bg-[#262A34] transition-all duration-200 cursor-pointer z-50"
              title="Cancel Promotion"
            >
              <X size={13} strokeWidth={2.5} />
            </button>
          )}

          {/* Piece Selection Buttons */}
          <div className="flex flex-row items-center gap-1 sm:gap-1.5 mt-3 px-1">
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
    </>
  )
}

export default PromotionSelector
