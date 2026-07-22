'use client'

import React from 'react'
import { PieceType, PieceColor } from '@/utils/chess'
import { SvgChessPiece, PieceThemeConfig, PIECE_THEMES } from './SvgChessPiece'
import { cn } from '@/lib/utils'

export interface CapturedPiecesProps {
  pieces: PieceType[]
  color: PieceColor // Color of pieces that were captured
  pieceTheme?: PieceThemeConfig
  customWhiteColor?: string
  customBlackColor?: string
  scoreAdvantage?: number
  className?: string
}

export function CapturedPieces({
  pieces = [],
  color,
  pieceTheme = PIECE_THEMES.classic,
  customWhiteColor,
  customBlackColor,
  scoreAdvantage = 0,
  className,
}: CapturedPiecesProps) {
  const hasCaptured = pieces && pieces.length > 0

  return (
    <div
      className={cn(
        'w-full flex flex-col gap-1.5 bg-[#F0EDFF]/80 dark:bg-[#1F222A] rounded-xl p-2.5 sm:p-3 border border-[#E0D9FF] dark:border-[#35383F] transition-all shadow-sm',
        className
      )}
    >
      {/* Header Info */}
      <div className="w-full flex items-center justify-between gap-2 flex-wrap">
        <h5 className="font-urbanist font-bold text-xs sm:text-sm text-[#212121] dark:text-[#FAFAFA] flex items-center gap-1.5">
          <span>Captured {color === 'white' ? 'White' : 'Black'} Pieces</span>
        </h5>
        {scoreAdvantage > 0 && (
          <span className="text-xs font-urbanist font-extrabold px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
            + {scoreAdvantage}
          </span>
        )}
      </div>

      {/* Captured Pieces List (All in one line, small size, scrollable, no grouping, hidden scrollbar) */}
      {hasCaptured ? (
        <div className="w-full flex items-center gap-1 min-h-[24px] overflow-x-auto py-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {(pieces || []).map((type, idx) => (
            <div
              key={idx}
              className="w-5 h-5 flex items-center justify-center bg-white dark:bg-[#262A34] rounded border border-gray-150 dark:border-gray-800 shadow-sm shrink-0"
              title={`${color} ${type}`}
            >
              <SvgChessPiece
                type={type}
                color={color}
                theme={pieceTheme}
                customWhiteColor={customWhiteColor}
                customBlackColor={customBlackColor}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="w-full min-h-[28px] flex items-center">
          <span className="text-xs font-urbanist text-[#757575] dark:text-[#BDBDBD] italic">
            No pieces captured yet
          </span>
        </div>
      )}
    </div>
  )
}

export default CapturedPieces
