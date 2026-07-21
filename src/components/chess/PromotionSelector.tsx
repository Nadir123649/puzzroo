'use client'

import React, { useEffect, useState } from 'react'
import { Square } from '@/lib/chess/chessEngine'
import { PieceColor, PieceType } from '@/utils/chess'
import { SvgChessPiece, PieceThemeConfig, PIECE_THEMES } from './SvgChessPiece'
import { cn } from '@/lib/utils'

const PIECE_OPTIONS: PieceType[] = ['queen', 'rook', 'bishop', 'knight']
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

interface PromotionSelectorProps {
  toSquare: Square
  color: PieceColor
  pieceTheme?: PieceThemeConfig
  customWhiteColor?: string
  customBlackColor?: string
  isMounted: boolean
  onSelect: (piece: PieceType) => void
  boardRef: React.RefObject<HTMLDivElement | null>
}

export function PromotionSelector({
  toSquare,
  color,
  pieceTheme = PIECE_THEMES.classic,
  customWhiteColor,
  customBlackColor,
  isMounted,
  onSelect,
  boardRef,
}: PromotionSelectorProps) {
  const [style, setStyle] = useState<React.CSSProperties>({ opacity: 0 })
  const isWhite = color === 'white'
  const promotingOnRank8 = toSquare[1] === '8'
  const fileIndex = FILES.indexOf(toSquare[0])
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!isMounted) return
    const animFrame = requestAnimationFrame(() => {
      setVisible(true)
      if (!boardRef.current) return
      const boardRect = boardRef.current.getBoundingClientRect()
      const squareSize = boardRect.width / 8
      const leftOffset = fileIndex * squareSize + boardRect.left
      const baseWidth = Math.min(240, squareSize * 4.5)

      setStyle({
        position: 'fixed',
        left: Math.max(8, Math.min(leftOffset - baseWidth / 2 + squareSize / 2, window.innerWidth - baseWidth - 8)),
        top: promotingOnRank8
          ? boardRect.top + squareSize * 0.1
          : boardRect.top + boardRect.height - squareSize * 1.1 - 60,
        zIndex: 99999,
      })
    })
    return () => cancelAnimationFrame(animFrame)
  }, [isMounted, fileIndex, promotingOnRank8, boardRef])

  if (!isMounted) return null

  return (
    <div
      style={style}
      className={cn(
        'flex flex-col items-center transition-all duration-200',
        visible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
      )}
    >
      <div
        className={cn(
          'flex rounded-xl border-2 border-[#6949FF]/40 bg-white dark:bg-[#1F222A] shadow-2xl overflow-hidden',
          'sm:flex-row flex-col'
        )}
      >
        {PIECE_OPTIONS.map((pType) => (
          <button
            key={pType}
            onClick={() => onSelect(pType)}
            className="flex flex-col items-center justify-center p-2.5 sm:p-3 hover:bg-[#F0EDFF] dark:hover:bg-[#262A34] transition-all duration-150 active:scale-95 cursor-pointer border-b sm:border-b-0 sm:border-r last:border-0 border-gray-100 dark:border-gray-800"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10">
              <SvgChessPiece
                type={pType}
                color={color}
                theme={pieceTheme}
                customWhiteColor={customWhiteColor}
                customBlackColor={customBlackColor}
              />
            </div>
            <span className="text-[10px] font-urbanist font-bold capitalize mt-0.5 text-[#212121] dark:text-[#FAFAFA]">
              {pType}
            </span>
          </button>
        ))}
      </div>
      <div
        className={cn(
          'w-0 h-0 border-l-[10px] border-r-[10px] border-solid border-l-transparent border-r-transparent',
          promotingOnRank8
            ? 'border-t-[10px] border-t-white dark:border-t-[#1F222A] -mt-px'
            : 'border-b-[10px] border-b-white dark:border-b-[#1F222A] -mb-px'
        )}
      />
    </div>
  )
}

export default PromotionSelector
