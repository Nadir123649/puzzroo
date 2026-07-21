'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Zap, ShieldAlert, Trophy } from 'lucide-react'

export type DifficultyLevel = 'easy' | 'medium' | 'hard'

interface DifficultyOption {
  id: DifficultyLevel
  label: string
  description: string
  icon: React.ElementType
  color: string
}

const DIFFICULTIES: DifficultyOption[] = [
  {
    id: 'easy',
    label: 'Easy',
    description: 'Casual & Relaxed match',
    icon: Zap,
    color: 'text-[#22C55E] bg-[#DCFCE7] dark:bg-[#166534]/30 border-[#BBF7D0] dark:border-[#166534]',
  },
  {
    id: 'medium',
    label: 'Medium',
    description: 'Balanced challenge',
    icon: ShieldAlert,
    color: 'text-[#3B82F6] bg-[#DBEAFE] dark:bg-[#1E3A8A]/30 border-[#BFDBFE] dark:border-[#1E3A8A]',
  },
  {
    id: 'hard',
    label: 'Hard',
    description: 'For experienced players',
    icon: Trophy,
    color: 'text-[#EF4444] bg-[#FEE2E2] dark:bg-[#991B1B]/30 border-[#FECACA] dark:border-[#991B1B]',
  },
]

interface DifficultySelectorProps {
  selected: DifficultyLevel
  onSelect: (difficulty: DifficultyLevel) => void
  className?: string
}

export function DifficultySelector({ selected, onSelect, className }: DifficultySelectorProps) {
  return (
    <div className={cn('flex flex-col gap-2.5 w-full', className)}>
      <label className="font-urbanist font-bold text-sm sm:text-base text-[#212121] dark:text-[#FAFAFA] flex items-center gap-2">
        <span>Select Difficulty</span>
      </label>

      <div className="grid grid-cols-3 gap-2.5">
        {DIFFICULTIES.map((diff) => {
          const isSelected = selected === diff.id
          const Icon = diff.icon
          return (
            <button
              key={diff.id}
              type="button"
              onClick={() => onSelect(diff.id)}
              className={cn(
                'flex flex-col items-center justify-center p-3 rounded-xl sm:rounded-2xl border-2 transition-all duration-200 text-center cursor-pointer active:scale-95',
                isSelected
                  ? 'border-[#6949FF] bg-[#6949FF]/10 dark:bg-[#6949FF]/20 ring-2 ring-[#6949FF]/30 shadow-md'
                  : 'border-gray-200 dark:border-[#35383F] bg-white dark:bg-[#1F222A] hover:border-gray-300 dark:hover:border-gray-600'
              )}
            >
              <div
                className={cn(
                  'w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mb-1.5 border',
                  diff.color
                )}
              >
                <Icon size={18} />
              </div>
              <span className="font-urbanist font-extrabold text-xs sm:text-sm text-[#212121] dark:text-[#FAFAFA]">
                {diff.label}
              </span>
              <span className="font-urbanist text-[10px] text-[#757575] dark:text-[#BDBDBD] hidden sm:block mt-0.5">
                {diff.description}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default DifficultySelector
