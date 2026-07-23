'use client'

import React from 'react'
import { BoardThemeId, getBoardTheme, BoardGrid } from '@/utils/chess'
import { PieceThemeId, PIECE_THEMES } from '../SvgChessPiece'
import { ChessBoard } from '../ChessBoard'
import { cn } from '@/lib/utils'

// Queen's Gambit Declined Opening Position (1. d4 d5  2. c4 e6  3. Nc3 Nf6)
const SAMPLE_PREVIEW_GRID: BoardGrid = [
  // Rank 8 (Row 0)
  [
    { type: 'rook', color: 'black' },
    { type: 'knight', color: 'black' },
    { type: 'bishop', color: 'black' },
    { type: 'queen', color: 'black' },
    { type: 'king', color: 'black' },
    { type: 'bishop', color: 'black' },
    null,
    { type: 'rook', color: 'black' },
  ],
  // Rank 7 (Row 1)
  [
    { type: 'pawn', color: 'black' },
    { type: 'pawn', color: 'black' },
    { type: 'pawn', color: 'black' },
    null,
    null,
    { type: 'pawn', color: 'black' },
    { type: 'pawn', color: 'black' },
    { type: 'pawn', color: 'black' },
  ],
  // Rank 6 (Row 2)
  [null, null, null, null, { type: 'pawn', color: 'black' }, { type: 'knight', color: 'black' }, null, null],
  // Rank 5 (Row 3)
  [null, null, null, { type: 'pawn', color: 'black' }, null, null, null, null],
  // Rank 4 (Row 4)
  [null, null, { type: 'pawn', color: 'white' }, { type: 'pawn', color: 'white' }, null, null, null, null],
  // Rank 3 (Row 5)
  [null, null, { type: 'knight', color: 'white' }, null, null, null, null, null],
  // Rank 2 (Row 6)
  [
    { type: 'pawn', color: 'white' },
    { type: 'pawn', color: 'white' },
    null,
    null,
    { type: 'pawn', color: 'white' },
    { type: 'pawn', color: 'white' },
    { type: 'pawn', color: 'white' },
    { type: 'pawn', color: 'white' },
  ],
  // Rank 1 (Row 7)
  [
    { type: 'rook', color: 'white' },
    null,
    { type: 'bishop', color: 'white' },
    { type: 'queen', color: 'white' },
    { type: 'king', color: 'white' },
    { type: 'bishop', color: 'white' },
    { type: 'knight', color: 'white' },
    { type: 'rook', color: 'white' },
  ],
]

interface BoardPreviewProps {
  boardThemeId: BoardThemeId
  pieceThemeId: PieceThemeId
  customWhiteColor?: string
  customBlackColor?: string
  className?: string
}

export function BoardPreview({
  boardThemeId,
  pieceThemeId,
  customWhiteColor,
  customBlackColor,
  className,
}: BoardPreviewProps) {
  const activeBoardTheme = getBoardTheme(boardThemeId)
  const activePieceTheme = PIECE_THEMES[pieceThemeId]

  return (
    <div
      className={cn(
        'w-full flex flex-col items-center gap-3 bg-[#F0EDFF]/70 dark:bg-[#1F222A] p-4 sm:p-5 rounded-2xl border border-[#E0D9FF] dark:border-[#35383F] shadow-sm',
        className
      )}
    >
      <div className="w-full flex items-center justify-between">
        <h4 className="font-urbanist font-bold text-sm sm:text-base text-[#212121] dark:text-[#FAFAFA] flex items-center gap-2">
          <span>Live Board Preview</span>
        </h4>
        <span className="text-xs font-urbanist font-semibold px-2.5 py-0.5 rounded-full bg-[#6949FF]/10 text-[#6949FF] dark:bg-[#6949FF]/20 dark:text-purple-300">
          {activeBoardTheme.name} • {activePieceTheme.name}
        </span>
      </div>

      {/* Live Chess Board */}
      <div className="w-full max-w-[500px] aspect-square flex items-center justify-center py-2">
        <ChessBoard
          boardState={SAMPLE_PREVIEW_GRID}
          theme={activeBoardTheme}
          pieceTheme={activePieceTheme}
          customWhiteColor={customWhiteColor}
          customBlackColor={customBlackColor}
        />
      </div>

      <p className="text-xs font-urbanist text-[#757575] dark:text-[#BDBDBD] text-center">
        This preview shows how pieces and squares will appear in your match.
      </p>
    </div>
  )
}

export default BoardPreview
