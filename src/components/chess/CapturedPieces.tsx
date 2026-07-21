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
  // Group captured pieces by type for clean display
  const pieceCounts = (pieces || []).reduce<Record<string, number>>((acc, type) => {
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})

  const hasCaptured = pieces && pieces.length > 0

  return (
    <div
      className={cn(
        'w-full flex flex-col gap-2 bg-[#F0EDFF]/80 dark:bg-[#1F222A] rounded-xl p-2 sm:p-3 border border-[#E0D9FF] dark:border-[#35383F] transition-all shadow-sm',
        className
      )}
    >
      {/* Header Info */}
      <div className="w-full flex items-center justify-between gap-2 flex-wrap">
        <h5 className="font-urbanist font-bold text-xs sm:text-sm text-[#212121] dark:text-[#FAFAFA] flex items-center gap-1.5">
          <span>Captured {color === 'white' ? 'White' : 'Black'} Pieces</span>
        </h5>
        <div className="flex items-center gap-1.5">
          {scoreAdvantage > 0 && (
            <span className="text-xs font-urbanist font-extrabold px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400">
              +{scoreAdvantage}
            </span>
          )}
          <span className="text-xs font-urbanist font-semibold px-2 py-0.5 rounded-full bg-white/80 dark:bg-[#262A34] text-[#757575] dark:text-[#BDBDBD] border border-gray-200 dark:border-gray-700">
            Total: {pieces ? pieces.length : 0}
          </span>
        </div>
      </div>

      {/* Captured Pieces List */}
      {hasCaptured ? (
        <div className="w-full flex items-center flex-wrap gap-2 min-h-[32px]">
          {Object.entries(pieceCounts).map(([type, count]) => {
            return (
              <div
                key={type}
                className="flex items-center bg-white dark:bg-[#262A34] px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm gap-1"
                title={`${count} ${color} ${type}`}
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  <SvgChessPiece
                    type={type as PieceType}
                    color={color}
                    theme={pieceTheme}
                    customWhiteColor={customWhiteColor}
                    customBlackColor={customBlackColor}
                  />
                </div>
                {count > 1 && (
                  <span className="font-urbanist font-extrabold text-xs text-[#6949FF]">
                    ×{count}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="w-full min-h-[32px] flex items-center">
          <span className="text-xs font-urbanist text-[#757575] dark:text-[#BDBDBD] italic">
            No pieces captured yet
          </span>
        </div>
      )}
    </div>
  )
}

export default CapturedPieces
