'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { images } from '@/lib/utils'
import { GameLoader } from '@/components/ui/GameLoader'

interface SudokuHeroProps {
  backTo?: string // Optional custom back navigation path
}

export function SudokuHero({ backTo }: SudokuHeroProps = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname() || ''
  const [isNavigating, setIsNavigating] = useState(false)
  const [loaderText, setLoaderText] = useState("Back to lobby...")

  const dateParam = searchParams?.get('date')
  const hasDate = !!dateParam
  const difficulty = (searchParams?.get('difficulty') as 'easy' | 'medium' | 'hard' | 'expert' | null) || 'easy'

  const isDailyChallenge = pathname.includes('/daily-challenge/')
  const isPastPuzzle = hasDate

  // backTo and isPastPuzzle are used by handleBackClick


  // Prevent scroll when loading overlay is active
  useEffect(() => {
    if (isNavigating) {
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
    } else {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
  }, [isNavigating])

  const handleBackClick = async () => {
    const params = new URLSearchParams(window.location.search)
    const hasDate = params.has('date')
    
    const returnUrl = hasDate ? (typeof window !== 'undefined' ? sessionStorage.getItem('puzzroo_return_url') : null) : null
    if (returnUrl) {
      setLoaderText("Back to past puzzles...")
      setIsNavigating(true)
      await new Promise(resolve => setTimeout(resolve, 1000))
      sessionStorage.removeItem('puzzroo_return_url')
      router.push(`${returnUrl}${returnUrl.includes('?') ? '&' : '?'}back=past`)
    } else if (backTo && backTo.includes('/past-puzzles/')) {
      setLoaderText("Back to past puzzles...")
      setIsNavigating(true)
      await new Promise(resolve => setTimeout(resolve, 1000))
      router.push(`${backTo}${backTo.includes('?') ? '&' : '?'}back=past`)
    } else {
      setLoaderText("Back to lobby...")
      setIsNavigating(true)
      await new Promise(resolve => setTimeout(resolve, 1000))
      router.push(backTo || '/game/sudoku?back=lobby')
    }
  }

  return (
    <>
      <section className="w-full bg-white dark:bg-[#181A20] transition-colors duration-300 py-[10px] md:py-[15px]">
        <div className="w-full px-[20px] relative">
          {/* Back Arrow Placeholder to preserve layout flow */}
          <div className="hidden sm:flex w-full h-10 sm:h-12 items-center mb-2 pointer-events-none" />

          {/* Actual Sticky Back Arrow */}
          <button
            onClick={handleBackClick}
            disabled={isNavigating}
            className="fixed top-[76px] left-[20px] md:top-[110px] md:left-[20px] min-[1380px]:left-[calc((100vw-1380px)/2+20px)] z-[150] w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-[var(--color-primary)] bg-white dark:bg-[#181A20] flex items-center justify-center p-2 hover:bg-[#F0EDFF] dark:hover:bg-[#35383F] transition-[background-color,border-color,transform,opacity] duration-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm hidden sm:flex"
            aria-label="Back to games"
          >
            <ArrowLeft size={20} className="text-[var(--color-primary)]" strokeWidth={2.5} />
          </button>

          <div className="flex flex-col items-center gap-4 md:gap-5">
            
            {/* Sudoku Image with background */}
            <div className="w-[129px] h-[129px] relative flex items-center justify-center bg-[#F0EDFF] dark:bg-[#1F222A] rounded-[6px] p-[14px]">
              <Image
                src="/soduko.svg"
                alt="Sudoku"
                width={101}
                height={101}
                className="w-[101px] h-[101px] object-contain"
              />
            </div>

            {/* Sudoku Title */}
            <h1 className="font-urbanist font-bold text-[30px] md:text-[48px] leading-[120%] text-center text-[#212121] dark:text-[#FAFAFA] transition-colors duration-300">
              SUDOKU
            </h1>

            {/* Difficulty Badge */}
            {difficulty && (
              <div className="flex justify-center mt-1">
                <span className="font-urbanist text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-[#F0EDFF] dark:bg-[#35383F] text-[#6949FF] dark:text-[#A592FF]">
                  {difficulty}
                </span>
              </div>
            )}

            {/* Date Display */}
            {dateParam && (
              <div className="flex items-center gap-4 mt-2">
                <span className="font-urbanist text-[13px] font-bold text-[#757575] dark:text-[#BDBDBD]">
                  {dateParam}
                </span>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* Loading Overlay for Navigation */}
      <GameLoader isOpen={isNavigating} text={loaderText} />
    </>
  )
}
