'use client'

import { InputMode } from '@shared/lib/nonogram/types'
import { PaintBucket, Flag } from 'lucide-react'

interface InputModeToolbarProps {
  activeMode: InputMode
  onModeChange: (mode: InputMode) => void
  disabled?: boolean
  maxWidth?: number // Board width to match
}

export function InputModeToolbar({
  activeMode,
  onModeChange,
  disabled = false,
  maxWidth,
}: InputModeToolbarProps) {
  return (
    <div 
      className="flex items-center justify-center gap-2 w-full"
      style={maxWidth ? { maxWidth: `${maxWidth}px` } : undefined}
    >
      {/* Fill Mode Button */}
      <button
        onClick={() => onModeChange('fill')}
        disabled={disabled}
        className={`
          flex-1 h-[44px] rounded-lg
          flex items-center justify-center gap-1.5
          font-urbanist font-bold text-[14px]
          transition-all duration-200
          active:scale-95
          disabled:cursor-not-allowed disabled:opacity-50
          ${
            activeMode === 'fill'
              ? 'bg-[#6949FF] hover:bg-[#5536E6] text-white shadow-md scale-[1.02]'
              : 'bg-[#F5F6FA] dark:bg-[#35383F] hover:bg-[#E8DFFF] dark:hover:bg-[#424242] text-[#2B2F3A] dark:text-white'
          }
        `}
        aria-label="Fill mode - mark cells that belong to the image"
        aria-pressed={activeMode === 'fill'}
      >
        <PaintBucket size={18} />
        <span>Fill</span>
      </button>

      {/* Mark Mode Button */}
      <button
        onClick={() => onModeChange('mark')}
        disabled={disabled}
        className={`
          flex-1 h-[44px] rounded-lg
          flex items-center justify-center gap-1.5
          font-urbanist font-bold text-[14px]
          transition-all duration-200
          active:scale-95
          disabled:cursor-not-allowed disabled:opacity-50
          ${
            activeMode === 'mark'
              ? 'bg-[#6949FF] hover:bg-[#5536E6] text-white shadow-md scale-[1.02]'
              : 'bg-[#F5F6FA] dark:bg-[#35383F] hover:bg-[#E8DFFF] dark:hover:bg-[#424242] text-[#2B2F3A] dark:text-white'
          }
        `}
        aria-label="Mark mode - mark cells that should not belong to the image"
        aria-pressed={activeMode === 'mark'}
      >
        <Flag size={18} />
        <span>Mark</span>
      </button>
    </div>
  )
}
