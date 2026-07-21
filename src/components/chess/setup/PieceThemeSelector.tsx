'use client'

import React from 'react'
import { PieceThemeId, PIECE_THEMES, PieceThemeConfig } from '../SvgChessPiece'
import { SvgChessPiece } from '../SvgChessPiece'
import { cn } from '@/lib/utils'

// Quick preset swatches for custom piece colors
const CUSTOM_PRESET_SWATCHES = [
  { name: 'Pure Black & White', white: '#FFFFFF', black: '#010101' },
  { name: 'Crimson & Cobalt', white: '#EF4444', black: '#3B82F6' },
  { name: 'Purple & Gold', white: '#A855F7', black: '#EAB308' },
  { name: 'Cyan & Magenta', white: '#06B6D4', black: '#EC4899' },
]

interface PieceThemeSelectorProps {
  selected: PieceThemeId
  onSelect: (themeId: PieceThemeId) => void
  customWhiteColor?: string
  onCustomWhiteChange?: (color: string) => void
  customBlackColor?: string
  onCustomBlackChange?: (color: string) => void
  className?: string
}

export function PieceThemeSelector({
  selected,
  onSelect,
  customWhiteColor = '#FFFFFF',
  onCustomWhiteChange,
  customBlackColor = '#010101',
  onCustomBlackChange,
  className,
}: PieceThemeSelectorProps) {

  const handleWhiteColorChange = (val: string) => {
    let formatted = val.trim()
    if (!formatted.startsWith('#') && formatted.length > 0) {
      formatted = `#${formatted}`
    }
    onCustomWhiteChange?.(formatted)
    if (selected !== 'custom') {
      onSelect('custom')
    }
  }

  const handleBlackColorChange = (val: string) => {
    let formatted = val.trim()
    if (!formatted.startsWith('#') && formatted.length > 0) {
      formatted = `#${formatted}`
    }
    onCustomBlackChange?.(formatted)
    if (selected !== 'custom') {
      onSelect('custom')
    }
  }

  const handleApplySwatch = (white: string, black: string) => {
    onCustomWhiteChange?.(white)
    onCustomBlackChange?.(black)
    onSelect('custom')
  }

  return (
    <div className={cn('flex flex-col gap-3 w-full', className)}>
      <div className="flex items-center justify-between">
        <label className="font-urbanist font-bold text-sm sm:text-base text-[#212121] dark:text-[#FAFAFA]">
          Piece Style & Colors
        </label>
        <span className="text-xs font-urbanist font-semibold text-[#6949FF] dark:text-purple-300">
          Vector SVG Engine
        </span>
      </div>

      {/* Piece Theme Preset Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {Object.values(PIECE_THEMES).map((theme: PieceThemeConfig) => {
          const isSelected = selected === theme.id
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => onSelect(theme.id)}
              className={cn(
                'flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all duration-200 cursor-pointer active:scale-95 bg-white dark:bg-[#1F222A]',
                isSelected
                  ? 'border-[#6949FF] bg-[#6949FF]/5 dark:bg-[#6949FF]/15 ring-2 ring-[#6949FF]/30 shadow-md'
                  : 'border-gray-200 dark:border-[#35383F] hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              {/* High-Contrast Preview Piece Pair Slot */}
              <div className="w-full h-10 flex items-center justify-center gap-1 bg-gradient-to-r from-gray-200 via-slate-300 to-slate-400 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900 rounded-lg p-1 border border-black/10 dark:border-white/10 shadow-inner">
                <div className="w-7 h-7 flex items-center justify-center filter drop-shadow-sm">
                  <SvgChessPiece
                    type="knight"
                    color="white"
                    theme={theme}
                    customWhiteColor={theme.id === 'custom' ? customWhiteColor : undefined}
                    customBlackColor={theme.id === 'custom' ? customBlackColor : undefined}
                  />
                </div>
                <div className="w-7 h-7 flex items-center justify-center filter drop-shadow-sm">
                  <SvgChessPiece
                    type="knight"
                    color="black"
                    theme={theme}
                    customWhiteColor={theme.id === 'custom' ? customWhiteColor : undefined}
                    customBlackColor={theme.id === 'custom' ? customBlackColor : undefined}
                  />
                </div>
              </div>

              <span className="font-urbanist font-bold text-xs text-[#212121] dark:text-[#FAFAFA] truncate">
                {theme.name}
              </span>
            </button>
          )
        })}
      </div>

      {/* Custom Color Picker Panel (Shows when Custom is selected) */}
      {selected === 'custom' && onCustomWhiteChange && onCustomBlackChange && (
        <div className="flex flex-col gap-3 bg-white dark:bg-[#1F222A] p-4 rounded-xl border border-[#6949FF]/30 dark:border-[#35383F] shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
            <span className="font-urbanist font-extrabold text-xs text-[#6949FF] dark:text-purple-300 uppercase tracking-wider">
              Custom Color Configuration
            </span>
            <span className="text-[11px] font-urbanist text-[#757575] dark:text-[#BDBDBD]">
              Live Hex Code & Color Picker
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Custom White Pieces */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-urbanist font-bold text-[#212121] dark:text-[#FAFAFA]">
                White Pieces Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customWhiteColor.length === 7 ? customWhiteColor : '#FFFFFF'}
                  onChange={(e) => handleWhiteColorChange(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-gray-600 p-0.5 bg-transparent flex-shrink-0"
                  title="Pick White Piece Color"
                />
                <input
                  type="text"
                  value={customWhiteColor}
                  onChange={(e) => handleWhiteColorChange(e.target.value)}
                  placeholder="#FFFFFF"
                  maxLength={7}
                  className="w-full h-10 px-3 rounded-lg border-2 border-gray-200 dark:border-[#35383F] bg-gray-50 dark:bg-[#262A34] font-mono font-bold text-xs text-[#212121] dark:text-[#FAFAFA] focus:border-[#6949FF] focus:outline-none transition-all uppercase"
                />
              </div>
            </div>

            {/* Custom Black Pieces */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-urbanist font-bold text-[#212121] dark:text-[#FAFAFA]">
                Black Pieces Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customBlackColor.length === 7 ? customBlackColor : '#010101'}
                  onChange={(e) => handleBlackColorChange(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border-2 border-gray-300 dark:border-gray-600 p-0.5 bg-transparent flex-shrink-0"
                  title="Pick Black Piece Color"
                />
                <input
                  type="text"
                  value={customBlackColor}
                  onChange={(e) => handleBlackColorChange(e.target.value)}
                  placeholder="#010101"
                  maxLength={7}
                  className="w-full h-10 px-3 rounded-lg border-2 border-gray-200 dark:border-[#35383F] bg-gray-50 dark:bg-[#262A34] font-mono font-bold text-xs text-[#212121] dark:text-[#FAFAFA] focus:border-[#6949FF] focus:outline-none transition-all uppercase"
                />
              </div>
            </div>
          </div>

          {/* Quick Swatches */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-100 dark:border-gray-800">
            <span className="text-[11px] font-urbanist font-semibold text-[#757575] dark:text-[#BDBDBD]">
              Quick Custom Swatches:
            </span>
            <div className="flex items-center gap-2 flex-wrap">
              {CUSTOM_PRESET_SWATCHES.map((swatch) => (
                <button
                  key={swatch.name}
                  type="button"
                  onClick={() => handleApplySwatch(swatch.white, swatch.black)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-[#262A34] hover:border-[#6949FF] transition-all duration-200 active:scale-95 cursor-pointer"
                >
                  <div className="flex items-center -space-x-1">
                    <div className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: swatch.white }} />
                    <div className="w-3.5 h-3.5 rounded-full border border-black/20" style={{ backgroundColor: swatch.black }} />
                  </div>
                  <span className="text-[11px] font-urbanist font-medium text-[#212121] dark:text-[#FAFAFA]">
                    {swatch.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}

export default PieceThemeSelector
