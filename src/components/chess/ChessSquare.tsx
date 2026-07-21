'use client'

import React from 'react'
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
  disabled?: boolean
  onClick?: () => void
  onDragStart?: (e: React.DragEvent) => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: (e: React.DragEvent) => void
}

export function ChessSquare({
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
  disabled = false,
  onClick,
  onDragStart,
  onDragOver,
  onDrop,
}: ChessSquareProps) {
  const squareBgHex = isDarkSquare ? theme.darkSquareHex : theme.lightSquareHex
  const coordColorHex = isDarkSquare ? theme.coordinateColorDarkHex : theme.coordinateColorLightHex
  const squareName = `${fileLabel}${rankLabel}`

  const showRank = fileIndex === 0
  const showFile = rankIndex === 7

  return (
    <div
      onClick={disabled ? undefined : onClick}
      onDragOver={disabled ? undefined : onDragOver}
      onDrop={disabled ? undefined : onDrop}
      style={{ backgroundColor: squareBgHex }}
      className={cn(
        'relative aspect-square w-full h-full flex items-center justify-center transition-colors duration-150 group overflow-hidden select-none cursor-pointer',
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
      {isLegalMove && !piece && (
        <div className="absolute w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-[#6949FF]/70 dark:bg-purple-400/80 shadow-sm pointer-events-none z-20" />
      )}

      {/* Legal Capture Ring Indicator */}
      {isLegalMove && piece && (
        <div className="absolute inset-0 ring-4 ring-inset ring-[#EF4444]/80 bg-[#EF4444]/25 pointer-events-none z-20" />
      )}

      {/* Hover Micro-Animation Overlay */}
      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 dark:group-hover:bg-black/10 transition-colors pointer-events-none" />

      {/* Chess Piece */}
      {piece && (
        <div
          draggable={!disabled}
          onDragStart={onDragStart}
          className="w-full h-full flex items-center justify-center z-10"
        >
          <ChessPiece
            piece={piece}
            theme={pieceTheme}
            customWhiteColor={customWhiteColor}
            customBlackColor={customBlackColor}
          />
        </div>
      )}
    </div>
  )
}

export default ChessSquare
