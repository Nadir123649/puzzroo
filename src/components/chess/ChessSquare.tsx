'use client'

import React, { memo } from 'react'
import { ChessPieceData, BoardThemeConfig } from '@/utils/chess'
import { ChessPiece } from './ChessPiece'
import { BoardCoordinates } from './BoardCoordinates'
import { PieceThemeConfig } from './SvgChessPiece'
import { cn } from '@/lib/utils'

interface ChessSquareProps {
  fileIndex: number // 0-7 (a -> h)
  rankIndex: number // 0-7 (8 -> 1)
  fileLabel: string
  rankLabel: string
  piece: ChessPieceData | null
  theme: BoardThemeConfig
  pieceTheme?: PieceThemeConfig
  customWhiteColor?: string
  customBlackColor?: string
  isDarkSquare: boolean
  isSelected?: boolean
  isLegalMove?: boolean
  isCapture?: boolean
  isLastMove?: boolean
  isKingInCheck?: boolean
  isMoveDest?: boolean
  disabled?: boolean
  onClick?: () => void
  onPointerDown?: (e: React.PointerEvent) => void
}

export const ChessSquare = memo(function ChessSquare({
  fileIndex,
  rankIndex,
  fileLabel,
  rankLabel,
  piece,
  theme,
  pieceTheme,
  customWhiteColor,
  customBlackColor,
  isDarkSquare,
  isSelected = false,
  isLegalMove = false,
  isCapture = false,
  isLastMove = false,
  isKingInCheck = false,
  isMoveDest = false,
  disabled = false,
  onClick,
  onPointerDown,
}: ChessSquareProps) {
  const squareBgHex = isDarkSquare ? theme.darkSquareHex : theme.lightSquareHex
  const coordColorHex = isDarkSquare ? theme.coordinateColorDarkHex : theme.coordinateColorLightHex
  const squareName = `${fileLabel}${rankLabel}`

  const showRank = fileIndex === 0
  const showFile = rankIndex === 7

  return (
    <div
      suppressHydrationWarning
      onClick={disabled ? undefined : onClick}
      onPointerDown={disabled ? undefined : onPointerDown}
      style={{ backgroundColor: squareBgHex }}
      className={cn(
        'relative aspect-square w-full h-full flex items-center justify-center transition-colors duration-150 group overflow-hidden select-none cursor-pointer touch-none',
        disabled && 'cursor-not-allowed'
      )}
      data-square={squareName}
    >
      {/* Rank Label (Top-Left corner) */}
      {showRank && (
        <BoardCoordinates
          label={rankLabel}
          type="rank"
          position="inside"
          style={{ color: coordColorHex }}
        />
      )}

      {/* File Label (Bottom-Right corner) */}
      {showFile && (
        <BoardCoordinates
          label={fileLabel}
          type="file"
          position="inside"
          style={{ color: coordColorHex }}
        />
      )}

      {/* Last Move Highlight Overlay */}
      {isLastMove && (
        <div className="absolute inset-0 bg-yellow-400/35 pointer-events-none transition-colors" />
      )}

      {/* Selected Square Highlight Overlay */}
      {isSelected && (
        <div className="absolute inset-0 bg-[#6949FF]/40 ring-4 ring-inset ring-[#6949FF] pointer-events-none transition-all z-10" />
      )}

      {/* King in Check Red Glow Overlay */}
      {isKingInCheck && (
        <div className="absolute inset-0 bg-red-500/40 ring-4 ring-inset ring-red-600 animate-pulse pointer-events-none z-10" />
      )}

      {/* Legal Move Indicator (Empty Square Dot) */}
      {isLegalMove && !piece && !isCapture && (
        <div className="absolute w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#22C55E]/80 dark:bg-[#22C55E]/90 shadow-sm pointer-events-none z-20" />
      )}

      {/* Legal Capture Ring Indicator */}
      {isCapture && piece && (
        <div className="absolute inset-0 ring-4 ring-inset ring-[#EF4444]/80 bg-[#EF4444]/25 pointer-events-none z-20 animate-pulse" />
      )}

      {/* Hover Micro-Animation Overlay */}
      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 dark:group-hover:bg-black/10 transition-colors pointer-events-none" />

      {/* Chess Piece */}
      {piece && (
        <div className="w-full h-full flex items-center justify-center z-10 pointer-events-none">
          <ChessPiece
            piece={piece}
            theme={pieceTheme}
            customWhiteColor={customWhiteColor}
            customBlackColor={customBlackColor}
            animateIn={isMoveDest}
          />
        </div>
      )}
    </div>
  )
})

export default ChessSquare
