'use client'

import React from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { RotateCcw, RefreshCw, Settings, Flag, Volume2, VolumeX, RotateCw } from 'lucide-react'

interface GameControlsProps {
  onNewGame?: () => void
  onRestart?: () => void
  onUndo?: () => void
  onFlipBoard?: () => void
  onResign?: () => void
  onToggleSound?: () => void
  isFlipped?: boolean
  isMuted?: boolean
  disabled?: boolean
  className?: string
}

export function GameControls({
  onNewGame,
  onRestart,
  onUndo,
  onFlipBoard,
  onResign,
  onToggleSound,
  isFlipped = false,
  isMuted = false,
  disabled = false,
  className,
}: GameControlsProps) {
  return (
    <div
      className={cn(
        'w-full bg-[#F0EDFF] dark:bg-[#1F222A] rounded-xl sm:rounded-2xl p-4 sm:p-5 border border-[#E0D9FF] dark:border-[#35383F] flex flex-col gap-4 shadow-sm',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <h4 className="font-urbanist font-bold text-base text-[#212121] dark:text-[#FAFAFA]">
          Game Actions
        </h4>
        <button
          onClick={onToggleSound}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white dark:bg-[#262A34] border border-gray-200 dark:border-gray-700 text-xs font-urbanist font-bold text-[#6949FF] hover:bg-[#6949FF] hover:text-white transition-all"
          title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
        >
          {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          <span>{isMuted ? 'Muted' : 'Audio On'}</span>
        </button>
      </div>

      {/* Main Buttons Grid */}
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
        {/* Undo Move Button */}
        <button
          onClick={onUndo}
          disabled={disabled}
          className="h-10 px-2 flex items-center justify-center gap-1.5 rounded-full border-2 border-[#6949FF] text-[#6949FF] dark:text-[#FAFAFA] bg-white dark:bg-[#262A34] hover:bg-[#6949FF] hover:text-white font-urbanist font-bold text-xs sm:text-sm transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        >
          <RotateCcw size={15} className="flex-shrink-0" />
          <span className="whitespace-nowrap">Undo</span>
        </button>

        {/* Flip Board Button */}
        <button
          onClick={onFlipBoard}
          className={cn(
            'h-10 px-2 flex items-center justify-center gap-1.5 rounded-full border-2 font-urbanist font-bold text-xs sm:text-sm transition-all duration-200 active:scale-95 whitespace-nowrap',
            isFlipped
              ? 'bg-[#6949FF] text-white border-[#6949FF]'
              : 'border-[#6949FF] text-[#6949FF] dark:text-[#FAFAFA] bg-white dark:bg-[#262A34] hover:bg-[#6949FF] hover:text-white'
          )}
        >
          <RotateCw size={15} className="flex-shrink-0" />
          <span className="whitespace-nowrap">Flip Board</span>
        </button>

        {/* Restart Match Button */}
        <button
          onClick={onRestart}
          disabled={disabled}
          className="h-10 px-2 flex items-center justify-center gap-1.5 rounded-full border border-gray-300 dark:border-gray-700 text-[#757575] dark:text-[#BDBDBD] hover:bg-gray-100 dark:hover:bg-[#262A34] font-urbanist font-bold text-xs transition-all duration-200 active:scale-95 disabled:opacity-50 whitespace-nowrap"
        >
          <RefreshCw size={14} className="flex-shrink-0" />
          <span className="whitespace-nowrap">Restart</span>
        </button>

        {/* Resign Match Button */}
        <button
          onClick={onResign}
          disabled={disabled}
          className="h-10 px-2 flex items-center justify-center gap-1.5 rounded-full border border-red-300 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-urbanist font-bold text-xs transition-all duration-200 active:scale-95 disabled:opacity-50 whitespace-nowrap"
        >
          <Flag size={14} className="flex-shrink-0" />
          <span className="whitespace-nowrap">Resign</span>
        </button>

        {/* New Game Setup Button */}
        <Link
          href="/chess/setup"
          className="col-span-2 h-11 px-3 flex items-center justify-center gap-2 rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white font-urbanist font-bold text-xs sm:text-sm transition-all duration-200 active:scale-95 shadow-md shadow-[#6949FF]/20 mt-1 whitespace-nowrap"
        >
          <Settings size={16} className="flex-shrink-0" />
          <span className="whitespace-nowrap">New Match Setup</span>
        </Link>
      </div>
    </div>
  )
}

export default GameControls
