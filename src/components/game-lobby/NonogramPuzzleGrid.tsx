'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Clock, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { getPuzzlesByDifficulty } from '@shared/data/nonogram'
import { getCompletedPuzzleIds } from '@shared/lib/nonogram/completion'
import { useGameLobby } from '@/contexts/GameLobbyContext'
import { images } from '@/lib/utils'
import { useTheme } from '@/hooks/use-theme'
import type { Difficulty } from '@shared/lib/nonogram/types'

const ITEMS_PER_PAGE = 8

export function NonogramPuzzleGrid() {
  const router = useRouter()
  const { selectedDifficulty } = useGameLobby()
  const { theme } = useTheme()
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)

  const nonogramImage = theme === 'light' ? images.gameCards.nonogramWhite : images.gameCards.nonogram

  useEffect(() => {
    setCompletedIds(getCompletedPuzzleIds())
  }, [])

  const allPuzzles = useMemo(
    () => getPuzzlesByDifficulty(selectedDifficulty as Difficulty),
    [selectedDifficulty]
  )

  const totalPages = Math.max(1, Math.ceil(allPuzzles.length / ITEMS_PER_PAGE))
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedPuzzles = allPuzzles.slice(startIndex, endIndex)

  // Clamp currentPage when total pages shrinks
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [allPuzzles.length, totalPages, currentPage])

  // Reset to page 1 when difficulty changes
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedDifficulty])

  const handlePlay = (puzzleId: string) => {
    router.push(`/nonogram?difficulty=${selectedDifficulty}&puzzleId=${puzzleId}`)
  }

  return (
    <section className="w-full bg-white dark:bg-[#181A20] py-8 md:py-12">
      <div className="w-full px-[20px] max-w-[1380px] mx-auto">
        <div className="text-center mb-8">
          <h2 className="font-urbanist text-[28px] md:text-[36px] font-bold text-[#2B2F3A] dark:text-white mb-2">
            Pick a Puzzle
          </h2>
          <p className="font-urbanist text-[14px] md:text-[16px] text-[#616161] dark:text-[#A0A4B8]">
            {allPuzzles.length} {selectedDifficulty} puzzles available
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
          {paginatedPuzzles.map((puzzle) => {
            const isCompleted = completedIds.has(puzzle.id)

            return (
              <div
                key={puzzle.id}
                onClick={() => handlePlay(puzzle.id)}
                className="group relative bg-white dark:bg-[#1F222A] border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] rounded-2xl p-4 flex flex-col gap-4 hover:border-[#6949FF] hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 cursor-pointer"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handlePlay(puzzle.id)
                  }
                }}
                aria-label={`Play ${puzzle.title} puzzle`}
              >
                {isCompleted && (
                  <div className="absolute top-3 right-3 bg-[#22C55E] text-white rounded-full p-1.5 shadow-lg">
                    <Check size={16} strokeWidth={3} />
                  </div>
                )}

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

                <div className="text-center">
                  <h3 className="font-urbanist text-[18px] font-bold text-[#2B2F3A] dark:text-white mb-1">
                    {puzzle.title}
                  </h3>
                  <span className="inline-block px-3 py-1 rounded-full bg-[#F0EDFF] dark:bg-[#35383F] font-urbanist text-[11px] font-semibold text-[#6949FF] dark:text-[#A592FF]">
                    {puzzle.category}
                  </span>
                </div>

                <div className="space-y-2 text-[12px] border-t border-[#F0F0F0] dark:border-[#35383F] pt-3">
                  <div className="flex items-center justify-between">
                    <span className="font-urbanist text-[#757575] dark:text-[#BDBDBD]">Grid Size</span>
                    <span className="font-urbanist font-semibold text-[#424242] dark:text-[#E0E0E0]">
                      {puzzle.size}x{puzzle.size}
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

                <div className="w-full h-[42px] rounded-full font-urbanist font-semibold text-[14px] transition-all duration-200 flex items-center justify-center gap-2 bg-[#6949FF] group-hover:bg-[#5536E6] text-white">
                  <span>Start Puzzle</span>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="transform group-hover:translate-x-1 transition-transform">
                    <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            )
          })}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-6 mt-6 md:mt-8">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="w-11 h-11 rounded-full border-2 border-[#6949FF] dark:border-[#6949FF] bg-white dark:bg-[#1F222A] flex items-center justify-center text-[#6949FF] hover:bg-[#F0EDFF] dark:hover:bg-[#2D2640] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-[#1F222A] disabled:border-[#BDBDBD] dark:disabled:border-[#616161] disabled:text-[#757575] dark:disabled:text-[#9E9E9E]"
              aria-label="Previous Page"
            >
              <ChevronLeft size={24} strokeWidth={2.5} />
            </button>

            <span className="font-urbanist font-bold text-[16px] text-[#212121] dark:text-[#FAFAFA]">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="w-11 h-11 rounded-full border-2 border-[#6949FF] dark:border-[#6949FF] bg-white dark:bg-[#1F222A] flex items-center justify-center text-[#6949FF] hover:bg-[#F0EDFF] dark:hover:bg-[#2D2640] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white dark:disabled:hover:bg-[#1F222A] disabled:border-[#BDBDBD] dark:disabled:border-[#616161] disabled:text-[#757575] dark:disabled:text-[#9E9E9E]"
              aria-label="Next Page"
            >
              <ChevronRight size={24} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
