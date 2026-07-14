/**
 * Tangram Completion Modal
 * Phase 3: Shows when puzzle is completed or time's up
 */

'use client'

import { useEffect } from 'react'

interface TangramModalProps {
  isOpen: boolean
  time: number
  mistakes: number
  hintsUsed: number
  score: number
  difficulty?: string
  timeRemaining?: number
  isTimeUp?: boolean
  onPlayAgain: () => void
  onNewPuzzle?: () => void
  onBackToLobby?: () => void
  onClose?: () => void
}

export function TangramModal({
  isOpen,
  time,
  mistakes,
  hintsUsed,
  score,
  difficulty = 'easy',
  timeRemaining = 0,
  isTimeUp = false,
  onPlayAgain,
  onNewPuzzle,
  onBackToLobby,
  onClose,
}: TangramModalProps) {
  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && onClose) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onClose])

  // Disable body scroll when modal is open
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
        className={`fixed inset-0 bg-black/50 dark:bg-black/70 z-[99999] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
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
          {/* X Close Button - lets user peek at the solved board */}
          <button
            onClick={onClose ?? onPlayAgain}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-[#757575] hover:text-[#212121] dark:text-[#9E9E9E] dark:hover:text-white hover:bg-black/10 dark:hover:bg-white/10 transition-all"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
          
          {/* Modal Content */}
          <div className="text-center mb-4 sm:mb-6">
            <div className="text-5xl sm:text-6xl mb-2 sm:mb-4">{isTimeUp ? '⏰' : '🎉'}</div>
            <h2
              id="modal-title"
              className="font-urbanist text-2xl sm:text-3xl font-bold text-[#212121] dark:text-white mb-1 sm:mb-2"
            >
              {isTimeUp ? "Time's Up!" : 'Puzzle Complete!'}
            </h2>
            <p className="font-urbanist text-[#424242] dark:text-[#E0E0E0] text-sm sm:text-lg">
              {isTimeUp
                ? 'The countdown reached zero. Try again!'
                : 'Congratulations! You successfully completed the Tangram puzzle.'}
            </p>
          </div>

          {/* Stats */}
          {!isTimeUp && (
            <div className="bg-[#F0EDFF] dark:bg-[#35383F] rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 space-y-1.5 sm:space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-urbanist text-[#424242] dark:text-[#E0E0E0] font-medium text-xs sm:text-base">
                  Difficulty
                </span>
                <span className="font-urbanist text-[var(--color-primary)] font-bold text-base sm:text-lg capitalize">
                  {difficulty}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-urbanist text-[#424242] dark:text-[#E0E0E0] font-medium text-xs sm:text-base">
                  Time
                </span>
                <span className="font-urbanist text-[var(--color-primary)] font-bold text-base sm:text-lg">
                  {formatTime(time)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-urbanist text-[#424242] dark:text-[#E0E0E0] font-medium text-xs sm:text-base">
                  Hints Used
                </span>
                <span className="font-urbanist text-[var(--color-primary)] font-bold text-base sm:text-lg">
                  {hintsUsed}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-urbanist text-[#424242] dark:text-[#E0E0E0] font-medium text-xs sm:text-base">
                  Final Score
                </span>
                <span className="font-urbanist text-[var(--color-primary)] font-bold text-base sm:text-lg">
                  {score}
                </span>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col gap-2.5 sm:gap-3">
            {isTimeUp ? (
              <>
                <button
                  onClick={onPlayAgain}
                  className="w-full h-[42px] sm:h-[46px] rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-urbanist font-bold text-[14px] sm:text-[16px] transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                >
                  Retry
                </button>
                {onNewPuzzle && (
                  <button
                    onClick={onNewPuzzle}
                    className="w-full h-[42px] sm:h-[46px] rounded-full border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[#F0EDFF] dark:hover:bg-[#35383F] font-urbanist font-bold text-[14px] sm:text-[16px] transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                  >
                    New Puzzle
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={onPlayAgain}
                  className="w-full h-[42px] sm:h-[46px] rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-urbanist font-bold text-[14px] sm:text-[16px] transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                >
                  Play Again
                </button>
                {onNewPuzzle && (
                  <button
                    onClick={onNewPuzzle}
                    className="w-full h-[42px] sm:h-[46px] rounded-full border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[#F0EDFF] dark:hover:bg-[#35383F] font-urbanist font-bold text-[14px] sm:text-[16px] transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                  >
                    New Game
                  </button>
                )}
                {onBackToLobby && (
                  <button
                    onClick={onBackToLobby}
                    className="w-full h-[42px] sm:h-[46px] rounded-full border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[#F0EDFF] dark:hover:bg-[#35383F] font-urbanist font-bold text-[14px] sm:text-[16px] transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                  >
                    Back to Lobby
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
