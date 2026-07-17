'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Check, Clock } from 'lucide-react'
import { Difficulty } from '@shared/lib/nonogram/types'
import { getPuzzlesByDifficulty, puzzleCounts } from '@shared/data/nonogram'
import { getCompletedPuzzleIds } from '@shared/lib/nonogram/completion'
import { images } from '@/lib/utils'
import { useTheme } from '@/hooks/use-theme'

interface PuzzleSelectionProps {
  onSelectPuzzle: (puzzleId: string) => void
}

export function PuzzleSelection({ onSelectPuzzle }: PuzzleSelectionProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { theme } = useTheme()

  // Sync difficulty tab with the ?difficulty= URL param set by the game lobby Play button
  const urlDifficulty = searchParams.get('difficulty') as Difficulty | null
  const validDifficulties: Difficulty[] = ['easy', 'medium', 'hard']
  const initialDifficulty: Difficulty =
    urlDifficulty && validDifficulties.includes(urlDifficulty) ? urlDifficulty : 'easy'

  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(initialDifficulty)
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())

  // Get theme-aware nonogram image
  const nonogramImage = theme === 'light' ? images.gameCards.nonogramWhite : images.gameCards.nonogram

  // When the URL difficulty param changes (e.g. browser back/forward), update the tab
  useEffect(() => {
    if (urlDifficulty && validDifficulties.includes(urlDifficulty)) {
      setSelectedDifficulty(urlDifficulty)
    }
  }, [urlDifficulty])

  useEffect(() => {
    // Load completed puzzle IDs on mount (client-side only)
    setCompletedIds(getCompletedPuzzleIds())
  }, [])

  const puzzles = getPuzzlesByDifficulty(selectedDifficulty)

  const handleDifficultyChange = (difficulty: Difficulty) => {
    setSelectedDifficulty(difficulty)
  }

  const handlePuzzleClick = (puzzleId: string) => {
    onSelectPuzzle(puzzleId)
  }

  return (
    <section className="w-full bg-white dark:bg-[#181A20] py-8 md:py-12">
      <div className="w-full px-[20px] max-w-[1380px] mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="font-urbanist text-[28px] md:text-[36px] font-bold text-[#2B2F3A] dark:text-white mb-2">
            Choose Your Puzzle
          </h2>
          <p className="font-urbanist text-[14px] md:text-[16px] text-[#616161] dark:text-[#A0A4B8]">
            Select difficulty and pick a puzzle to start playing
          </p>
        </div>

        {/* Difficulty Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex gap-2 p-1.5 bg-[#F5F6FA] dark:bg-[#35383F] rounded-full">
            <button
              onClick={() => handleDifficultyChange('easy')}
              className={`px-6 py-2.5 rounded-full font-urbanist text-[14px] font-semibold transition-all duration-200 ${
                selectedDifficulty === 'easy'
                  ? 'bg-[#6949FF] text-white shadow-lg shadow-purple-500/30'
                  : 'text-[#616161] dark:text-[#A0A4B8] hover:text-[#6949FF] dark:hover:text-[#8B6EFF]'
              }`}
            >
              Easy ({puzzleCounts.easy})
            </button>
            <button
              onClick={() => handleDifficultyChange('medium')}
              className={`px-6 py-2.5 rounded-full font-urbanist text-[14px] font-semibold transition-all duration-200 ${
                selectedDifficulty === 'medium'
                  ? 'bg-[#6949FF] text-white shadow-lg shadow-purple-500/30'
                  : 'text-[#616161] dark:text-[#A0A4B8] hover:text-[#6949FF] dark:hover:text-[#8B6EFF]'
              }`}
            >
              Medium ({puzzleCounts.medium})
            </button>
            <button
              onClick={() => handleDifficultyChange('hard')}
              className={`px-6 py-2.5 rounded-full font-urbanist text-[14px] font-semibold transition-all duration-200 ${
                selectedDifficulty === 'hard'
                  ? 'bg-[#6949FF] text-white shadow-lg shadow-purple-500/30'
                  : 'text-[#616161] dark:text-[#A0A4B8] hover:text-[#6949FF] dark:hover:text-[#8B6EFF]'
              }`}
            >
              Hard ({puzzleCounts.hard})
            </button>
          </div>
        </div>

        {/* Puzzle Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          {puzzles.map((puzzle) => {
            const isCompleted = completedIds.has(puzzle.id)
            
            return (
              <div
                key={puzzle.id}
                onClick={() => handlePuzzleClick(puzzle.id)}
                className="group relative bg-white dark:bg-[#1F222A] border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] rounded-2xl p-4 flex flex-col gap-4 hover:border-[#6949FF] hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 cursor-pointer"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handlePuzzleClick(puzzle.id)
                  }
                }}
                aria-label={`Play ${puzzle.title} puzzle`}
              >
                {/* Completed Badge */}
                {isCompleted && (
                  <div className="absolute top-3 right-3 bg-[#22C55E] text-white rounded-full p-1.5 shadow-lg">
                    <Check size={16} strokeWidth={3} />
                  </div>
                )}

                {/* Puzzle Icon/Preview */}
                <div className="flex justify-center">
                  <div className="w-20 h-20 bg-[#F0EDFF] dark:bg-[#35383F] rounded-xl flex items-center justify-center group-hover:shadow-md group-hover:shadow-purple-500/20 transition-shadow duration-300">
                    <Image
                      src={nonogramImage}
                      alt="Nonogram"
                      width={48}
                      height={48}
                      className="object-contain"
                    />
                  </div>
                </div>

                {/* Puzzle Title */}
                <div className="text-center">
                  <h3 className="font-urbanist text-[18px] font-bold text-[#2B2F3A] dark:text-white mb-1">
                    {puzzle.title}
                  </h3>
                  <span className="inline-block px-3 py-1 rounded-full bg-[#F0EDFF] dark:bg-[#35383F] font-urbanist text-[11px] font-semibold text-[#6949FF] dark:text-[#A592FF]">
                    {puzzle.category}
                  </span>
                </div>

                {/* Puzzle Details */}
                <div className="space-y-2 text-[12px] border-t border-[#F0F0F0] dark:border-[#35383F] pt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-urbanist text-[#757575] dark:text-[#BDBDBD]">Grid Size</span>
                    <span className="font-urbanist font-semibold text-[#424242] dark:text-[#E0E0E0]">
                      {puzzle.size}×{puzzle.size}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-urbanist text-[#757575] dark:text-[#BDBDBD] flex items-center gap-1">
                      <Clock size={12} />
                      Est. Time
                    </span>
                    <span className="font-urbanist font-semibold text-[#424242] dark:text-[#E0E0E0]">
                      ~{Math.floor(puzzle.estimatedTime / 60)} min
                    </span>
                  </div>
                </div>

                {/* Play Badge - NOT a button */}
                <div
                  className={`w-full h-[42px] rounded-full font-urbanist font-semibold text-[14px] transition-all duration-200 flex items-center justify-center gap-2 ${
                    isCompleted
                      ? 'bg-[#22C55E] group-hover:bg-[#16A34A] text-white'
                      : 'bg-[#6949FF] group-hover:bg-[#5536E6] text-white'
                  }`}
                >
                  <span>{isCompleted ? 'Play Again' : 'Start Puzzle'}</span>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="transform group-hover:translate-x-1 transition-transform">
                    <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
