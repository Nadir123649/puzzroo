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
  className,
}: PlayerCardProps) {
  const isWhite = color === 'white'

  return (
    <div
      className={cn(
        'w-full bg-[#F0EDFF] dark:bg-[#1F222A] rounded-xl sm:rounded-2xl p-3 sm:p-4 border-2 transition-all duration-300 flex items-center justify-between gap-3',
        isActive
          ? 'border-[#6949FF] shadow-lg shadow-[#6949FF]/15 dark:shadow-[#6949FF]/20 ring-2 ring-[#6949FF]/30'
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

          {/* Color Badge indicator */}
          <span
            className={cn(
              'absolute bottom-0 right-0 w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full border-2 border-white dark:border-[#1F222A]',
              isWhite ? 'bg-white shadow-md' : 'bg-[#181A20]'
            )}
            title={`${color} pieces`}
          />
        </div>

        {/* Name, Title, Rating */}
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {title && (
              <span className="bg-[#6949FF] text-white text-[10px] font-urbanist font-bold px-1.5 py-0.5 rounded">
                {title}
              </span>
            )}
            <h4 className="font-urbanist font-bold text-sm sm:text-base text-[#212121] dark:text-[#FAFAFA] truncate">
              {name}
            </h4>
          </div>

          <div className="flex items-center gap-2 text-xs font-urbanist text-[#757575] dark:text-[#BDBDBD] truncate">
            {rating && <span>Rating: {rating}</span>}
            {difficulty && (
              <span className="bg-purple-100 dark:bg-purple-900/40 text-[#6949FF] dark:text-purple-300 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                {difficulty}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Active Indicator & Timer Placeholder */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {/* Active turn badge */}
        {isActive && (
          <span className="hidden sm:inline-flex items-center gap-1 bg-[#22C55E]/10 text-[#22C55E] text-xs font-urbanist font-semibold px-2.5 py-1 rounded-full animate-pulse">
            <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
            Turn
          </span>
        )}

        {/* Timer Placeholder */}
        <div className="bg-white dark:bg-[#262A34] px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-1.5">
          <svg
            className="w-4 h-4 text-[#757575] dark:text-[#BDBDBD]"
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
          <span className="font-mono font-bold text-sm sm:text-base text-[#212121] dark:text-[#FAFAFA]">
            {timePlaceholder}
          </span>
        </div>
      </div>
    </div>
  )
}

export default PlayerCard
