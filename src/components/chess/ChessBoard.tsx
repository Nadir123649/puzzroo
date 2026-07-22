'use client'

import React, { useState, useMemo, useCallback, useRef } from 'react'
import { Square } from '@/lib/chess/chessEngine'
import { BoardGrid, FILES, RANKS, BoardThemeConfig, getBoardTheme, ChessPieceData } from '@/utils/chess'
import { ChessSquare } from './ChessSquare'
import { ChessPiece } from './ChessPiece'
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
  hintMove?: { from: Square; to: Square } | null
  isCheckmate?: boolean
  disabled?: boolean
  onSquareSelect?: (square: Square) => void
  onMoveExecute?: (from: Square, to: Square) => void
  className?: string
}

export const ChessBoard = React.memo(function ChessBoard({
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
  hintMove = null,
  isCheckmate = false,
  disabled = false,
  onSquareSelect,
  onMoveExecute,
  className,
}: ChessBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null)
  const [draggedSquare, setDraggedSquare] = useState<Square | null>(null)
  const [isPointerDragging, setIsPointerDragging] = useState(false)
  const dragState = useRef<{
    fromSquare: Square
    piece: ChessPieceData
    pointerId: number
    startX: number
    startY: number
    currentX: number
    currentY: number
    isDragging: boolean
  } | null>(null)

  const [, forceRender] = useState(0)
  const dragRetryRef = useRef(0)

  const rankIndices = useMemo(() => isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7], [isFlipped])
  const fileIndices = useMemo(() => isFlipped ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7], [isFlipped])

  const getSquareFromPoint = useCallback((clientX: number, clientY: number): Square | null => {
    if (!boardRef.current) return null
    const boardRect = boardRef.current.getBoundingClientRect()
    const gridEl = boardRef.current.querySelector('.chess-grid') as HTMLElement | null
    if (!gridEl) return null
    const gridRect = gridEl.getBoundingClientRect()
    const sqSize = gridRect.width / 8
    const relX = clientX - gridRect.left
    const relY = clientY - gridRect.top
    if (relX < 0 || relY < 0 || relX > gridRect.width || relY > gridRect.height) return null
    let col = Math.floor(relX / sqSize)
    let row = Math.floor(relY / sqSize)
    if (col < 0 || col > 7 || row < 0 || row > 7) return null
    if (isFlipped) { col = 7 - col; row = 7 - row }
    const fileLabel = FILES[col]
    const rankLabel = RANKS[row]
    return `${fileLabel}${rankLabel}` as Square
  }, [isFlipped])

  const handlePointerDown = useCallback((squareName: Square, piece: ChessPieceData | null, e: React.PointerEvent) => {
    if (disabled || !piece) return

    dragState.current = {
      fromSquare: squareName,
      piece,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
      isDragging: false,
    }
  }, [disabled])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current) return

    dragState.current.currentX = e.clientX
    dragState.current.currentY = e.clientY

    const dx = Math.abs(e.clientX - dragState.current.startX)
    const dy = Math.abs(e.clientY - dragState.current.startY)

    if (!dragState.current.isDragging && (dx > 5 || dy > 5)) {
      dragState.current.isDragging = true
      setDraggedSquare(dragState.current.fromSquare)
      try {
        ;(e.target as HTMLElement).setPointerCapture?.(dragState.current.pointerId)
      } catch {}
      forceRender(n => n + 1)
    }

    if (dragState.current.isDragging) {
      e.preventDefault()
      forceRender(n => n + 1)
    }
  }, [])

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!dragState.current) return

    const ds = dragState.current
    try {
      (e.target as HTMLElement).releasePointerCapture?.(ds.pointerId)
    } catch {}

    dragState.current = null
    setDraggedSquare(null)
    forceRender(n => n + 1)

    if (ds.isDragging) {
      e.preventDefault()
      const targetSquare = getSquareFromPoint(e.clientX, e.clientY)
      if (targetSquare && targetSquare !== ds.fromSquare) {
        onMoveExecute?.(ds.fromSquare, targetSquare)
      }
    }
  }, [getSquareFromPoint, onMoveExecute])

  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    if (dragState.current) {
      try {
        (e.target as HTMLElement).releasePointerCapture?.(dragState.current.pointerId)
      } catch {}
    }
    dragState.current = null
    setDraggedSquare(null)
    forceRender(n => n + 1)
  }, [])

  const squares = useMemo(() => {
    const result: React.ReactNode[] = []
    for (let ri = 0; ri < 8; ri++) {
      const rIdx = rankIndices[ri]
      for (let fi = 0; fi < 8; fi++) {
        const fIdx = fileIndices[fi]
        const piece = boardState[rIdx]?.[fIdx] || null
        const isDarkSquare = (rIdx + fIdx) % 2 === 1
        const rankLabel = RANKS[rIdx]
        const fileLabel = FILES[fIdx]
        const squareName = `${fileLabel}${rankLabel}` as Square

        const isSelected = selectedSquare === squareName
        const isLegal = legalMoves.includes(squareName)
        const isCapture = captureMoves.includes(squareName)
        const isLast = lastMove?.from === squareName || lastMove?.to === squareName
        const isMoveDest = lastMove?.to === squareName
        const isCheck = kingInCheckSquare === squareName
        const isHint = hintMove?.from === squareName || hintMove?.to === squareName
        const isCheckmateSquare = isCheckmate && isCheck

        const isBeingDragged = draggedSquare === squareName

        result.push(
          <ChessSquare
            key={squareName}
            fileIndex={fIdx}
            rankIndex={rIdx}
            fileLabel={fileLabel}
            rankLabel={rankLabel}
            piece={isBeingDragged ? null : piece}
            theme={theme}
            pieceTheme={pieceTheme}
            customWhiteColor={customWhiteColor}
            customBlackColor={customBlackColor}
            isDarkSquare={isDarkSquare}
            isSelected={isSelected}
            isLegalMove={isLegal}
            isCapture={isCapture}
            isLastMove={isLast}
            isMoveDest={isMoveDest}
            isKingInCheck={isCheck && !isCheckmateSquare}
            isCheckmate={isCheckmateSquare}
            isHint={isHint}
            disabled={disabled}
            onClick={() => onSquareSelect?.(squareName)}
            onPointerDown={(e) => handlePointerDown(squareName, piece, e)}
          />
        )
      }
    }
    return result
  }, [
    boardState, theme, pieceTheme, customWhiteColor, customBlackColor,
    rankIndices, fileIndices, selectedSquare, legalMoves, captureMoves,
    lastMove, kingInCheckSquare, disabled, onSquareSelect, handlePointerDown, draggedSquare, hintMove, isCheckmate
  ])

  return (
    <div
      ref={boardRef}
      suppressHydrationWarning
      className={cn(
        'w-full max-w-[500px] aspect-square mx-auto flex flex-col justify-center items-center select-none touch-none',
        className
      )}
      onPointerMove={disabled ? undefined : handlePointerMove}
      onPointerUp={disabled ? undefined : handlePointerUp}
      onPointerCancel={disabled ? undefined : handlePointerCancel}
    >
      <div
        style={{ borderColor: theme.boardBorderColor, backgroundColor: theme.boardBorderColor }}
        className={cn(
          'w-full h-full aspect-square rounded-[16px] sm:rounded-[24px] overflow-hidden shadow-2xl transition-all duration-300 border-4 sm:border-8'
        )}
      >
        <div className="chess-grid w-full h-full grid grid-cols-8 grid-rows-8 shadow-inner relative">
          {squares}

          {/* Floating dragged piece */}
          {dragState.current?.isDragging && (
            <div
              className="fixed pointer-events-none z-[9999]"
              style={{
                left: dragState.current.currentX - 32,
                top: dragState.current.currentY - 48,
                width: '64px',
                height: '64px',
                willChange: 'transform',
                transform: 'translateZ(0) scale(1.15)',
                filter: 'drop-shadow(0 10px 28px rgba(0,0,0,0.5))',
              }}
            >
              <ChessPiece
                piece={dragState.current.piece}
                theme={pieceTheme}
                customWhiteColor={customWhiteColor}
                customBlackColor={customBlackColor}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

export default ChessBoard
