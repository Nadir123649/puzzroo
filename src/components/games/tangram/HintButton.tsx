/**
 * Hint Button Component - Phase 3
 * Shows available hints and triggers hint display
 */

'use client'

import { Lightbulb } from 'lucide-react'
import { notify } from '@/lib/toast'

interface HintButtonProps {
  availableHints: number
  maxHints: number
  onRequestHint: () => void
  disabled?: boolean
}

export function HintButton({
  availableHints,
  maxHints,
  onRequestHint,
  disabled = false,
}: HintButtonProps) {
  const isDisabled = disabled || availableHints === 0

  const handleClick = () => {
    if (isDisabled) return
    onRequestHint()
    notify.infoKey('GAME_HINT_USED')
  }

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className="w-full h-[46px] rounded-full border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[#F0EDFF] dark:hover:bg-[#35383F] font-urbanist font-bold text-[16px] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      title={`${availableHints} hint${availableHints !== 1 ? 's' : ''} remaining`}
    >
      <Lightbulb size={20} />
      <span>
        Hint ({availableHints}/{maxHints})
      </span>
    </button>
  )
}
