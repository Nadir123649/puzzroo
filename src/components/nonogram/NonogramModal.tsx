'use client'

import { useEffect } from 'react'
import { formatTime } from '@/lib/nonogram/helpers'
import type { Difficulty } from '@/lib/nonogram/types'
import { Trophy, Clock, Target, Lightbulb, Frown, X } from 'lucide-react'

interface NonogramModalProps {
  isOpen: boolean
  difficulty: Difficulty
  time: number
  completionPercentage: number
  hintsUsed: number
  mistakes: number
  maxMistakes: number
  isWin: boolean
  onPlayAgain: () => void
  onNewPuzzle: () => void
  onBackToGames?: () => void
}

export function NonogramModal({
  isOpen,
  difficulty,
  time,
  completionPercentage,
  hintsUsed,
  mistakes,
  maxMistakes,
  isWin,
  onPlayAgain,
  onNewPuzzle,
  onBackToGames,
}: NonogramModalProps) {
  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onPlayAgain()
      }
    }

    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [isOpen, onPlayAgain])

  // Prevent body scroll when modal is open
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

  const difficultyDisplay = difficulty.charAt(0).toUpperCase() + difficulty.slice(1)

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-[99999] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onPlayAgain}
      />

      {/* Modal */}
      <div className={`fixed inset-0 z-[100000] flex items-center justify-center p-3 transition-opacity duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}>
        <div
          className={`bg-white dark:bg-[#1F222A] rounded-xl shadow-2xl max-w-[320px] w-full overflow-hidden transform transition-all duration-300 ${
            isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Header with Purple Gradient (matching original design) */}
          <div className="bg-gradient-to-br from-[#6949FF] to-[#8B6EFF] px-4 py-4 text-center relative overflow-hidden">
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full -ml-8 -mb-8" />
            
            {/* Close button */}
            <button
              onClick={onPlayAgain}
              className="absolute top-2 right-2 z-20 w-7 h-7 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Close modal"
            >
              <X className="w-4 h-4 text-white" />
            </button>
            
            {/* Content */}
            <div className="relative z-10">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-2">
                {isWin ? (
                  <Trophy className="w-5 h-5 text-white" />
                ) : (
                  <Frown className="w-5 h-5 text-white" />
                )}
              </div>
              <h2
                id="modal-title"
                className="font-urbanist text-xl font-extrabold text-white mb-0.5"
              >
                {isWin ? 'Puzzle Complete!' : 'Keep Going!'}
              </h2>
              <p className="font-urbanist text-white/90 text-xs">
                {isWin ? 'Amazing work on the puzzle!' : 'You reached the maximum mistakes limit.'}
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="px-4 py-4">
            <div className="grid grid-cols-2 gap-2 mb-4">
              {/* Difficulty */}
              <div className="bg-[#F5F6FA] dark:bg-[#35383F] rounded-lg p-2.5 text-center">
                <Target className="w-3.5 h-3.5 text-[#6949FF] mx-auto mb-1" />
                <div className="font-urbanist text-[9px] text-[#757575] dark:text-[#A0A4B8] uppercase tracking-wide mb-0.5">
                  Difficulty
                </div>
                <div className="font-urbanist text-base font-bold text-[#6949FF] dark:text-[#8B6EFF]">
                  {difficultyDisplay}
                </div>
              </div>

              {/* Time */}
              <div className="bg-[#F5F6FA] dark:bg-[#35383F] rounded-lg p-2.5 text-center">
                <Clock className="w-3.5 h-3.5 text-[#6949FF] mx-auto mb-1" />
                <div className="font-urbanist text-[9px] text-[#757575] dark:text-[#A0A4B8] uppercase tracking-wide mb-0.5">
                  Time
                </div>
                <div className="font-urbanist text-base font-bold text-[#6949FF] dark:text-[#8B6EFF]">
                  {formatTime(time)}
                </div>
              </div>

              {/* Completion */}
              <div className="bg-[#F5F6FA] dark:bg-[#35383F] rounded-lg p-2.5 text-center">
                <div className="w-3.5 h-3.5 mx-auto mb-1 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[#6949FF]">
                    <path d="M9 11L12 14L22 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="font-urbanist text-[9px] text-[#757575] dark:text-[#A0A4B8] uppercase tracking-wide mb-0.5">
                  Complete
                </div>
                <div className="font-urbanist text-base font-bold text-[#6949FF] dark:text-[#8B6EFF]">
                  {completionPercentage}%
                </div>
              </div>

              {/* Hints Used */}
              <div className="bg-[#F5F6FA] dark:bg-[#35383F] rounded-lg p-2.5 text-center">
                <Lightbulb className="w-3.5 h-3.5 text-[#6949FF] mx-auto mb-1" />
                <div className="font-urbanist text-[9px] text-[#757575] dark:text-[#A0A4B8] uppercase tracking-wide mb-0.5">
                  Hints
                </div>
                <div className="font-urbanist text-base font-bold text-[#6949FF] dark:text-[#8B6EFF]">
                  {hintsUsed}
                </div>
              </div>

              {/* Mistakes */}
              <div className="bg-[#FFF0F0] dark:bg-[#3A1A1A] border border-[#FFCDD2] dark:border-[#7A2A2A] rounded-lg p-2.5 text-center col-span-2">
                <div className="font-urbanist text-[9px] text-[#EF4444] dark:text-[#E57373] uppercase tracking-wide mb-0.5 font-bold">
                  Mistakes Made
                </div>
                <div className="font-urbanist text-base font-bold text-[#EF4444] dark:text-[#FF6B6B]">
                  {Math.min(mistakes, maxMistakes)} / {maxMistakes}
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-2">
              {isWin ? (
                <>
                  <button
                    onClick={onPlayAgain}
                    className="w-full h-[40px] rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white font-urbanist font-bold text-sm transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#6949FF] focus:ring-offset-2"
                  >
                    Replay
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onPlayAgain}
                    className="w-full h-[40px] rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white font-urbanist font-bold text-sm transition-all duration-200 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#6949FF] focus:ring-offset-2"
                  >
                    Try Again
                  </button>
                </>
              )}
              {onBackToGames && (
                <button
                  onClick={onBackToGames}
                  className="w-full h-[40px] rounded-full bg-white dark:bg-[#35383F] hover:bg-[#6949FF] dark:hover:bg-[#6949FF] text-[#6949FF] dark:text-white hover:text-white font-urbanist font-bold text-sm transition-all duration-200 active:scale-[0.98] focus:outline-none border border-[#E0E0E0] dark:border-[#424242] hover:border-[#6949FF]"
                >
                  Back to Games
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
