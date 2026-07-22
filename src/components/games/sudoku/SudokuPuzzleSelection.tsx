'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Check, Shuffle, Loader2 } from 'lucide-react'
import { gameApi } from '@/lib/api/gameApi'
import { getCompletedPuzzleIds } from '@shared/lib/completion/universal'
import { images } from '@/lib/utils'
import type { PuzzleSummary } from '@/lib/server/puzzles/types'

const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'] as const
const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert',
}
const PAGE_SIZE = 50

export function SudokuPuzzleSelection() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const urlDifficulty = searchParams.get('difficulty') as typeof DIFFICULTIES[number] | null
  const [selectedDifficulty, setSelectedDifficulty] = useState<typeof DIFFICULTIES[number]>
    (urlDifficulty && DIFFICULTIES.includes(urlDifficulty) ? urlDifficulty : 'easy')
  const [puzzles, setPuzzles] = useState<PuzzleSummary[]>([])
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [counts, setCounts] = useState<Record<string, number>>({})

  useEffect(() => {
    if (urlDifficulty && DIFFICULTIES.includes(urlDifficulty)) {
      setSelectedDifficulty(urlDifficulty)
    }
  }, [urlDifficulty])

  useEffect(() => {
    setCompletedIds(getCompletedPuzzleIds('sudoku'))
  }, [])

  // Load counts from local cache
  useEffect(() => {
    const cached = localStorage.getItem('puzzle_counts_sudoku')
    if (cached) {
      try {
        setCounts(JSON.parse(cached))
      } catch { }
    }
  }, [])

  // Update cache when counts change
  useEffect(() => {
    if (Object.keys(counts).length > 0) {
      localStorage.setItem('puzzle_counts_sudoku', JSON.stringify(counts))
    }
  }, [counts])

  // Fetch puzzles when difficulty changes
  const fetchPuzzles = useCallback(async (difficulty: string, cursor?: string | null) => {
    const data = await gameApi.listPuzzles('sudoku', {
      difficulty,
      limit: PAGE_SIZE,
      cursor: cursor ?? undefined,
    })
    return data
  }, [])

  useEffect(() => {
    setLoading(true)
    setNextCursor(null)
    fetchPuzzles(selectedDifficulty).then((data) => {
      setPuzzles(data?.items ?? [])
      setNextCursor(data?.nextCursor ?? null)
      setLoading(false)
    }).catch(() => {
      setPuzzles([])
      setLoading(false)
    })
  }, [selectedDifficulty, fetchPuzzles])

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    fetchPuzzles(selectedDifficulty, nextCursor).then((data) => {
      setPuzzles((prev) => [...prev, ...(data?.items ?? [])])
      setNextCursor(data?.nextCursor ?? null)
      setLoadingMore(false)
    }).catch(() => {
      setLoadingMore(false)
    })
  }

  const handlePlayPuzzle = (puzzleId: string) => {
    router.push(`/sudoku?id=${encodeURIComponent(puzzleId)}`)
  }

  const handlePlayRandom = () => {
    router.push(`/sudoku?difficulty=${selectedDifficulty}`)
  }

  const sudokuImage = images.gameCards.sudoku

  return (
    <section className="w-full bg-white dark:bg-[#181A20] py-8 md:py-12">
      <div className="w-full px-[20px] max-w-[1380px] mx-auto">
        <div className="text-center mb-8">
          <h2 className="font-urbanist text-[28px] md:text-[36px] font-bold text-[#2B2F3A] dark:text-white mb-2">
            Choose Your Puzzle
          </h2>
          <p className="font-urbanist text-[14px] md:text-[16px] text-[#616161] dark:text-[#A0A4B8]">
            Select difficulty and pick a puzzle to start playing
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="inline-flex gap-2 p-1.5 bg-[#F5F6FA] dark:bg-[#35383F] rounded-full flex-wrap justify-center">
            {DIFFICULTIES.map((diff) => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`px-6 py-2.5 rounded-full font-urbanist text-[14px] font-semibold transition-all duration-200 ${
                  selectedDifficulty === diff
                    ? 'bg-[#6949FF] text-white shadow-lg shadow-purple-500/30'
                    : 'text-[#616161] dark:text-[#A0A4B8] hover:text-[#6949FF] dark:hover:text-[#8B6EFF]'
                }`}
              >
                {DIFFICULTY_LABELS[diff]} ({counts[diff] ?? '...'})
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-center mb-8">
          <button
            onClick={handlePlayRandom}
            className="inline-flex items-center gap-2 px-8 py-3 bg-[#6949FF] hover:bg-[#5536E6] text-white font-urbanist font-bold text-[16px] rounded-full transition-all duration-200 active:scale-95 shadow-lg shadow-purple-500/30"
          >
            <Shuffle size={18} />
            Play Random {DIFFICULTY_LABELS[selectedDifficulty]} Puzzle
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-[#6949FF]" size={36} />
          </div>
        ) : puzzles.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
              {puzzles.map((puzzle) => {
                const isCompleted = completedIds.has(puzzle.id)
                return (
                  <div
                    key={puzzle.id}
                    onClick={() => handlePlayPuzzle(puzzle.id)}
                    className="group relative bg-white dark:bg-[#1F222A] border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] rounded-2xl p-4 flex flex-col gap-4 hover:border-[#6949FF] hover:shadow-lg hover:shadow-purple-500/10 transition-all duration-300 cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handlePlayPuzzle(puzzle.id)
                      }
                    }}
                  >
                    {isCompleted && (
                      <div className="absolute top-3 right-3 bg-[#22C55E] text-white rounded-full p-1.5 shadow-lg">
                        <Check size={16} strokeWidth={3} />
                      </div>
                    )}

                    <div className="flex justify-center">
                      <div className="w-20 h-20 bg-[#F0EDFF] dark:bg-[#35383F] rounded-xl flex items-center justify-center group-hover:shadow-md group-hover:shadow-purple-500/20 transition-shadow duration-300">
                        <Image
                          src={sudokuImage}
                          alt="Sudoku"
                          width={48}
                          height={48}
                          className="object-contain"
                        />
                      </div>
                    </div>

                    <div className="text-center">
                      <h3 className="font-urbanist text-[16px] font-bold text-[#2B2F3A] dark:text-white mb-1">
                        {DIFFICULTY_LABELS[puzzle.difficulty]} #{puzzle.id.split('-').pop()}
                      </h3>
                      <span className="inline-block px-3 py-1 rounded-full bg-[#F0EDFF] dark:bg-[#35383F] font-urbanist text-[11px] font-semibold text-[#6949FF] dark:text-[#A592FF]">
                        {puzzle.givens ?? '?'} clues
                      </span>
                    </div>

                    <div className="space-y-2 text-[12px] border-t border-[#F0F0F0] dark:border-[#35383F] pt-3">
                      <div className="flex items-center justify-between">
                        <span className="font-urbanist text-[#757575] dark:text-[#BDBDBD]">Grid</span>
                        <span className="font-urbanist font-semibold text-[#424242] dark:text-[#E0E0E0]">
                          {puzzle.size || 9}x{puzzle.size || 9}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-urbanist text-[#757575] dark:text-[#BDBDBD]">Tier</span>
                        <span className="font-urbanist font-semibold text-[#424242] dark:text-[#E0E0E0]">
                          {puzzle.tier ?? '-'}
                        </span>
                      </div>
                    </div>

                    <div className="w-full h-[42px] rounded-full font-urbanist font-semibold text-[14px] transition-all duration-200 flex items-center justify-center gap-2 bg-[#6949FF] group-hover:bg-[#5536E6] text-white">
                      <span>{isCompleted ? 'Play Again' : 'Start Puzzle'}</span>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="transform group-hover:translate-x-1 transition-transform">
                        <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                )
              })}
            </div>

            {nextCursor && (
              <div className="flex justify-center mt-8">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 px-8 py-3 border-2 border-[#6949FF] text-[#6949FF] font-urbanist font-bold text-[16px] rounded-full hover:bg-[#6949FF] hover:text-white transition-all duration-200 active:scale-95 disabled:opacity-50"
                >
                  {loadingMore ? <Loader2 className="animate-spin" size={18} /> : null}
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="font-urbanist text-[16px] text-[#616161] dark:text-[#A0A4B8]">
              No puzzles available for this difficulty.
            </p>
            <p className="font-urbanist text-[13px] text-[#9E9E9E] dark:text-[#757575] mt-2">
              Try selecting a different difficulty or check back later.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}