'use client'

import React from 'react'
import Image from 'next/image'
import { PieceColor } from '@/utils/chess/pieceAssets'
import { cn } from '@/lib/utils'

interface PlayerCardProps {
  name: string
  title?: string
  rating?: number | string
  color: PieceColor
  avatar?: string
  isActive?: boolean
  difficulty?: string
  timePlaceholder?: string
  lowTime?: boolean
  className?: string
}

export function PlayerCard({
  name,
  title,
  rating,
  color,
  avatar,
  isActive = false,
  difficulty,
  timePlaceholder = '10:00',
  lowTime = false,
  className,
}: PlayerCardProps) {
  const isWhite = color === 'white'

  return (
    <div
      className={cn(
        'w-full bg-[#F0EDFF] dark:bg-[#1F222A] rounded-xl sm:rounded-2xl p-2 sm:p-3 border-2 transition-colors duration-200 flex items-center justify-between gap-3',
        isActive
          ? 'border-[#6949FF] shadow-md'
          : 'border-transparent dark:border-[#35383F]',
        className
      )}
    >
      {/* Left: Avatar & Info */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar Container */}
        <div className="relative flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-white dark:bg-[#262A34] border-2 border-[#6949FF]/30 flex items-center justify-center shadow-sm">
          {avatar ? (
            <Image
              src={avatar}
              alt={name}
              fill
              className="object-cover"
            />
          ) : (
            <span className="font-urbanist font-extrabold text-sm sm:text-base text-[#6949FF]">
              {name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>

        {/* Name, Title, Rating */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 flex-nowrap min-w-0">
            {title && (
              <span className="bg-[#6949FF] text-white text-[10px] font-urbanist font-bold px-1.5 py-0.5 rounded flex-shrink-0 whitespace-nowrap">
                {title}
              </span>
            )}
            <h4 className="font-urbanist font-bold text-xs sm:text-sm md:text-base text-[#212121] dark:text-[#FAFAFA] truncate whitespace-nowrap">
              {name}
            </h4>
          </div>

          <div className="flex items-center gap-2 text-[11px] sm:text-xs font-urbanist text-[#757575] dark:text-[#BDBDBD] truncate whitespace-nowrap">
            <span className={cn('inline-block w-2.5 h-2.5 rounded-full border border-gray-400 flex-shrink-0', isWhite ? 'bg-white shadow-sm' : 'bg-gray-900')} title={`${color} pieces`} />
            {rating && <span className="whitespace-nowrap">Rating: {rating}</span>}
            {difficulty && (
              <span className="bg-purple-100 dark:bg-purple-900/40 text-[#6949FF] dark:text-purple-300 text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                {difficulty}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Active Indicator & Timer Placeholder */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Active turn badge with fixed layout dimensions */}
        <span
          className={cn(
            'hidden sm:inline-flex items-center gap-1 bg-[#22C55E]/15 text-[#22C55E] text-xs font-urbanist font-semibold px-2.5 py-1 rounded-full transition-opacity duration-200',
            isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
        >
          <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
          Turn
        </span>

        {/* Timer Placeholder */}
        <div className={cn(
          'px-3 py-1.5 rounded-lg border shadow-sm flex items-center gap-1.5 transition-all duration-300',
          lowTime
            ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 animate-pulse'
            : 'bg-white dark:bg-[#262A34] border-gray-200 dark:border-gray-700'
        )}>
          <svg
            className={cn('w-4 h-4', lowTime ? 'text-red-500' : 'text-[#757575] dark:text-[#BDBDBD]')}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span className={cn(
            'font-mono font-bold text-sm sm:text-base',
            lowTime ? 'text-red-600 dark:text-red-400' : 'text-[#212121] dark:text-[#FAFAFA]'
          )}>
            {timePlaceholder}
          </span>
        </div>
      </div>
    </div>
  )
}

export default PlayerCard
