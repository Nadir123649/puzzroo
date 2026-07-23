'use client'

import { useEffect } from 'react'
import { notify } from '@/lib/toast'

interface SudokuModalProps {
  isOpen: boolean
  type: 'win' | 'gameOver'
  time?: number
  mistakes?: number
  maxMistakes?: number
  score?: number
  onPlayAgain: () => void
  onNewGame?: () => void
  onBackToGames?: () => void
  onClose?: () => void
  gameName?: string
}

export function SudokuModal({
  isOpen,
  type,
  time,
  mistakes,
  maxMistakes,
  score,
  onPlayAgain,
  onNewGame,
  onBackToGames,
  onClose,
  gameName = 'Sudoku',
}: SudokuModalProps) {
  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (onClose) onClose()
        else onPlayAgain()
      }
    }

    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onPlayAgain, onClose])

  // Fire a success toast when the win modal opens
  useEffect(() => {
    if (isOpen && type === 'win') {
      notify.successKey('GAME_SOLVED')
    }
  }, [isOpen, type])
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-[99999] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose ?? onPlayAgain}
      />

      {/* Modal */}
      <div className={`fixed inset-0 z-[100000] flex items-center justify-center p-4 transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        <div
          className={`relative bg-[#F0EDFF] dark:bg-[#1F222A] rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-8 transform transition-all duration-300 ${
            isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* X Close Button */}
          <button
            onClick={onClose ?? onPlayAgain}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-[#757575] hover:text-[#212121] dark:text-[#9E9E9E] dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          {type === 'win' ? (
            // Win Modal Content
            <>
              <div className="text-center mb-4 sm:mb-6">
                <div className="text-5xl sm:text-6xl mb-2 sm:mb-4">🎉</div>
                <h2
                  id="modal-title"
                  className="font-urbanist text-2xl sm:text-3xl font-bold text-[#212121] dark:text-white mb-1 sm:mb-2"
                >
                  Congratulations!
                </h2>
                <p className="font-urbanist text-[#424242] dark:text-[#E0E0E0] text-sm sm:text-lg">
                  You solved the {gameName} puzzle!
                </p>
              </div>

              {/* Stats */}
              <div className="bg-[#F0EDFF] dark:bg-[#35383F] rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 space-y-1.5 sm:space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-urbanist text-[#424242] dark:text-[#E0E0E0] font-medium text-xs sm:text-base">
                    Time
                  </span>
                  <span className="font-urbanist text-[var(--color-primary)] font-bold text-base sm:text-lg">
                    {time !== undefined ? formatTime(time) : '00:00'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-urbanist text-[#424242] dark:text-[#E0E0E0] font-medium text-xs sm:text-base">
                    Mistakes
                  </span>
                  <span className="font-urbanist text-[var(--color-primary)] font-bold text-base sm:text-lg">
                    {mistakes ?? 0}/{maxMistakes ?? 3}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-urbanist text-[#424242] dark:text-[#E0E0E0] font-medium text-xs sm:text-base">
                    Score
                  </span>
                  <span className="font-urbanist text-[var(--color-primary)] font-bold text-base sm:text-lg">
                    {score ?? 0}
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-2.5 sm:gap-3">
                <button
                  onClick={onPlayAgain}
                  className="w-full h-[42px] sm:h-[46px] rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-urbanist font-bold text-[14px] sm:text-[16px] transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                >
                  Play Again
                </button>
                {onNewGame && (
                  <button
                    onClick={onNewGame}
                    className="w-full h-[42px] sm:h-[46px] rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-urbanist font-bold text-[14px] sm:text-[16px] transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                  >
                    New Game
                  </button>
                )}
                {onBackToGames && (
                  <button
                    onClick={onBackToGames}
                    className="w-full h-[42px] sm:h-[46px] rounded-full border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[#F0EDFF] dark:hover:bg-[#35383F] font-urbanist font-bold text-[14px] sm:text-[16px] transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                  >
                    Back To Games
                  </button>
                )}
              </div>
            </>
          ) : (
            // Game Over Modal Content
            <>
              <div className="text-center mb-4 sm:mb-6">
                <div className="text-5xl sm:text-6xl mb-2 sm:mb-4">💪</div>
                <h2
                  id="modal-title"
                  className="font-urbanist text-2xl sm:text-3xl font-bold text-[#212121] dark:text-white mb-1 sm:mb-2"
                >
                  Keep Going!
                </h2>
                <p className="font-urbanist text-[#424242] dark:text-[#E0E0E0] text-sm sm:text-lg">
                  You reached the maximum mistakes limit.
                </p>
              </div>

              {/* Final Score */}
              <div className="bg-[#F0EDFF] dark:bg-[#35383F] rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 space-y-1.5 sm:space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-urbanist text-[#424242] dark:text-[#E0E0E0] font-medium text-xs sm:text-base">
                    Time
                  </span>
                  <span className="font-urbanist text-[var(--color-primary)] font-bold text-base sm:text-lg">
                    {time !== undefined ? formatTime(time) : '00:00'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-urbanist text-[#424242] dark:text-[#E0E0E0] font-medium text-xs sm:text-base">
                    Mistakes
                  </span>
                  <span className="font-urbanist text-[var(--color-primary)] font-bold text-base sm:text-lg">
                    {mistakes ?? 0}/{maxMistakes ?? 3}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-urbanist text-[#424242] dark:text-[#E0E0E0] font-medium text-xs sm:text-base">
                    Final Score
                  </span>
                  <span className="font-urbanist text-[var(--color-primary)] font-bold text-base sm:text-lg">
                    {score ?? 0}
                  </span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-2.5 sm:gap-3">
                <button
                  onClick={onPlayAgain}
                  className="w-full h-[42px] sm:h-[46px] rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-urbanist font-bold text-[14px] sm:text-[16px] transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                >
                  Try Again
                </button>
                <button
                  onClick={onPlayAgain}
                  className="w-full h-[42px] sm:h-[46px] rounded-full border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[#F0EDFF] dark:hover:bg-[#35383F] font-urbanist font-bold text-[14px] sm:text-[16px] transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                >
                  New Game
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
