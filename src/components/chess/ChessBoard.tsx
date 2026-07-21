'use client'

import React, { useState } from 'react'
import { Square } from '@/lib/chess/chessEngine'
import { BoardGrid, FILES, RANKS, BoardThemeConfig, getBoardTheme } from '@/utils/chess'
import { ChessSquare } from './ChessSquare'
import { PieceThemeConfig } from './SvgChessPiece'
import { cn } from '@/lib/utils'

interface ChessBoardProps {
  boardState: BoardGrid
  theme?: BoardThemeConfig
  pieceTheme?: PieceThemeConfig
  customWhiteColor?: string
  customBlackColor?: string
  isFlipped?: boolean
  selectedSquare?: Square | null
  legalMoves?: Square[]
  captureMoves?: Square[]
  lastMove?: { from: Square; to: Square } | null
  kingInCheckSquare?: Square | null
  disabled?: boolean
  onSquareSelect?: (square: Square) => void
  onMoveExecute?: (from: Square, to: Square) => void
  className?: string
}

export function ChessBoard({
  boardState,
  theme = getBoardTheme('classic'),
  pieceTheme,
  customWhiteColor,
  customBlackColor,
  isFlipped = false,
  selectedSquare = null,
  legalMoves = [],
  captureMoves = [],
  lastMove = null,
  kingInCheckSquare = null,
  disabled = false,
  onSquareSelect,
  onMoveExecute,
  className,
}: ChessBoardProps) {
  const [draggedSquare, setDraggedSquare] = useState<Square | null>(null)

  const rankIndices = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7]
  const fileIndices = isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7]

  const handleDragStart = (squareName: Square, e: React.DragEvent) => {
    if (disabled) return
    setDraggedSquare(squareName)
    e.dataTransfer.setData('text/plain', squareName)
    onSquareSelect?.(squareName)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (squareName: Square, e: React.DragEvent) => {
    e.preventDefault()
    if (disabled) return
    const fromSquare = (draggedSquare || e.dataTransfer.getData('text/plain')) as Square
    if (fromSquare && fromSquare !== squareName) {
      onMoveExecute?.(fromSquare, squareName)
    }
    setDraggedSquare(null)
  }

  return (
    <div
      className={cn(
        'w-full max-w-[620px] aspect-square mx-auto flex flex-col justify-center items-center',
        className
      )}
    >
      {/* Outer Board Frame with Rounded Corners & Shadow */}
      <div
        style={{ borderColor: theme.boardBorderColor }}
        className={cn(
          'w-full h-full aspect-square rounded-[16px] sm:rounded-[24px] p-2 sm:p-3 sm:p-4 shadow-2xl transition-all duration-300 border-4 sm:border-8 bg-white dark:bg-[#1F222A]'
        )}
      >
        {/* 8x8 Board Grid Container */}
        <div className="w-full h-full grid grid-cols-8 grid-rows-8 rounded-lg overflow-hidden border border-black/10 dark:border-white/10 shadow-inner">
          {rankIndices.map((rIdx) => {
            return fileIndices.map((fIdx) => {
              const piece = boardState[rIdx]?.[fIdx] || null
              const isDarkSquare = (rIdx + fIdx) % 2 === 1
              const rankLabel = RANKS[rIdx]
              const fileLabel = FILES[fIdx]
              const squareName = `${fileLabel}${rankLabel}` as Square

              const isSelected = selectedSquare === squareName
              const isLegal = legalMoves.includes(squareName)
              const isCapture = captureMoves.includes(squareName)
              const isLast = lastMove?.from === squareName || lastMove?.to === squareName
              const isCheck = kingInCheckSquare === squareName

              return (
                <ChessSquare
                  key={squareName}
                  fileIndex={fIdx}
                  rankIndex={rIdx}
                  fileLabel={fileLabel}
                  rankLabel={rankLabel}
                  piece={piece}
                  theme={theme}
                  pieceTheme={pieceTheme}
                  customWhiteColor={customWhiteColor}
                  customBlackColor={customBlackColor}
                  isDarkSquare={isDarkSquare}
                  isSelected={isSelected}
                  isLegalMove={isLegal}
                  isCapture={isCapture}
                  isLastMove={isLast}
                  isKingInCheck={isCheck}
                  disabled={disabled}
                  onClick={() => onSquareSelect?.(squareName)}
                  onDragStart={(e) => handleDragStart(squareName, e)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(squareName, e)}
                />
              )
            })
          })}
        </div>
      </div>
    </div>
  )
}

export default ChessBoard
