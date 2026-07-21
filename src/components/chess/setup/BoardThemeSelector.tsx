'use client'

import React from 'react'
import { BoardThemeId, BOARD_THEMES, BoardThemeConfig } from '@/utils/chess'
import { cn } from '@/lib/utils'

interface BoardThemeSelectorProps {
  selected: BoardThemeId
  onSelect: (themeId: BoardThemeId) => void
  className?: string
}

export function BoardThemeSelector({ selected, onSelect, className }: BoardThemeSelectorProps) {
  return (
    <div className={cn('flex flex-col gap-2.5 w-full', className)}>
      <label className="font-urbanist font-bold text-sm sm:text-base text-[#212121] dark:text-[#FAFAFA]">
        Board Theme
      </label>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.values(BOARD_THEMES).map((theme: BoardThemeConfig) => {
          const isSelected = selected === theme.id
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onSelect(theme.id)}
              className={cn(
                'flex flex-col items-center gap-2 p-3 rounded-xl sm:rounded-2xl border-2 transition-all duration-200 cursor-pointer active:scale-95 bg-white dark:bg-[#1F222A]',
                isSelected
                  ? 'border-[#6949FF] bg-[#6949FF]/5 dark:bg-[#6949FF]/15 ring-2 ring-[#6949FF]/30 shadow-md'
                  : 'border-gray-200 dark:border-[#35383F] hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              {/* Theme Color Preview Grid */}
              <div
                style={{ borderColor: theme.boardBorderColor }}
                className="w-full h-12 rounded-lg border-2 p-0.5 grid grid-cols-2 grid-rows-2 overflow-hidden shadow-inner"
              >
                <div style={{ backgroundColor: theme.lightSquareHex }} />
                <div style={{ backgroundColor: theme.darkSquareHex }} />
                <div style={{ backgroundColor: theme.darkSquareHex }} />
                <div style={{ backgroundColor: theme.lightSquareHex }} />
              </div>

              <span className="font-urbanist font-bold text-xs sm:text-sm text-[#212121] dark:text-[#FAFAFA] truncate">
                {theme.name}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default BoardThemeSelector
