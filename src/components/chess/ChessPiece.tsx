'use client'

import React, { memo } from 'react'
import { ChessPieceData } from '@/utils/chess'
import { SvgChessPiece, PieceThemeConfig } from './SvgChessPiece'
import { cn } from '@/lib/utils'

interface ChessPieceProps {
  piece: ChessPieceData
  theme?: PieceThemeConfig
  customWhiteColor?: string
  customBlackColor?: string
  className?: string
  animateIn?: boolean
}

export const ChessPiece = memo(function ChessPiece({
  piece,
  theme,
  customWhiteColor,
  customBlackColor,
  className,
  animateIn = false,
}: ChessPieceProps) {
  return (
    <div
      className={cn(
        'relative w-full h-full flex items-center justify-center p-0 transition-transform duration-200 ease-out select-none cursor-pointer group-hover:scale-105 will-change-transform',
        animateIn && 'animate-piece-pop',
        className
      )}
    >
      <div className="w-full h-full flex items-center justify-center scale-105 sm:scale-110 drop-shadow-md transition-all duration-200 pointer-events-none p-0.5">
        <SvgChessPiece
          type={piece.type}
          color={piece.color}
          theme={theme}
          customWhiteColor={customWhiteColor}
          customBlackColor={customBlackColor}
        />
      </div>
    </div>
  )
})

export default ChessPiece
