'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Trophy, History, Gamepad2 } from 'lucide-react'
import { images } from '@/lib/utils'
import { GameLoader } from '@/components/ui/GameLoader'
import { useTheme } from '@/hooks/use-theme'

interface NonogramHeroProps {
  backTo?: string // Optional custom back navigation path
}

export function NonogramHero({ backTo }: NonogramHeroProps = {}) {
  const router = useRouter()
  const { theme } = useTheme()
  const searchParams = useSearchParams()
  const pathname = usePathname() || ''
  const [isNavigating, setIsNavigating] = useState(false)

  // Get theme-aware nonogram image
  const nonogramImage = theme === 'light' ? images.gameCards.nonogramWhite : images.gameCards.nonogram

  const dateParam = searchParams?.get('date')
  const hasDate = !!dateParam

  const isDailyChallenge = pathname.includes('/daily-challenge/')
  const isPastPuzzle = hasDate

  const diffParam = searchParams?.get('difficulty') || 'easy'
  const diffLabel = diffParam.charAt(0).toUpperCase() + diffParam.slice(1) + ' Mode'

  let modeLabel = diffLabel
  let ModeIcon = Gamepad2
  let modeColorClass = 'text-[#22C55E]'
  let modeBgClass = 'bg-[#DCFCE7] dark:bg-[#166534]/30 border-[#BBF7D0] dark:border-[#166534]'

  if (isDailyChallenge) {
    modeLabel = 'Daily Challenge'
    ModeIcon = Trophy
    modeColorClass = 'text-[#EAB308]'
    modeBgClass = 'bg-[#FEF08A] dark:bg-[#854D0E]/30 border-[#FEF08A] dark:border-[#854D0E]'
  } else if (isPastPuzzle) {
    modeLabel = 'Past Puzzle'
    ModeIcon = History
    modeColorClass = 'text-[#3B82F6]'
    modeBgClass = 'bg-[#DBEAFE] dark:bg-[#1E3A8A]/30 border-[#BFDBFE] dark:border-[#1E3A8A]'
  }

  const getAdjacentDates = (dateStr: string) => {
    const [m, d, y] = dateStr.split('-').map(Number)
    const currentDate = new Date(2000 + y, m - 1, d)
    currentDate.setHours(0, 0, 0, 0)
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const diffTime = today.getTime() - currentDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    const hasPrev = diffDays > 0 // Can go to newer puzzle (closer to today)
    const hasNext = diffDays < 23 // Can go to older puzzle (further in past)
    
    const prevDate = new Date(currentDate)
    prevDate.setDate(currentDate.getDate() + 1)
    
    const nextDate = new Date(currentDate)
    nextDate.setDate(currentDate.getDate() - 1)
    
    const formatDateStr = (date: Date) => {
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const year = String(date.getFullYear()).slice(-2)
      return `${month}-${day}-${year}`
    }
    
    return {
      hasPrev,
      hasNext,
      prevDateStr: formatDateStr(prevDate),
      nextDateStr: formatDateStr(nextDate),
    }
  }

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
    setIsNavigating(true)
    // Show loading for 1 second
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const params = new URLSearchParams(window.location.search)
    const hasDate = params.has('date')
    
    const returnUrl = hasDate ? (typeof window !== 'undefined' ? sessionStorage.getItem('puzzroo_return_url') : null) : null
    if (returnUrl) {
      sessionStorage.removeItem('puzzroo_return_url')
      router.push(returnUrl)
    } else {
      router.push(backTo || '/game/nonogram')
    }
  }

  return (
    <>
      <section className="w-full bg-white dark:bg-[#181A20] transition-colors duration-300 py-[10px] md:py-[15px]">
        <div className="w-full px-[20px]">
          {/* Back Arrow */}
          <button
            onClick={handleBackClick}
            disabled={isNavigating}
            className="md:fixed md:left-4 md:top-[100px] z-[50] mb-2 w-12 h-12 rounded-full border-2 border-[var(--color-primary)] bg-white dark:bg-[#181A20] flex items-center justify-center p-2 hover:bg-[#F0EDFF] dark:hover:bg-[#35383F] transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            aria-label="Back to games"
          >
            <ArrowLeft size={20} className="text-[var(--color-primary)]" strokeWidth={2.5} />
          </button>

          <div className="flex flex-col items-center gap-4 md:gap-5">
            
            {/* Nonogram Image with background */}
            <div className="w-[129px] h-[129px] relative flex items-center justify-center bg-[#F0EDFF] dark:bg-[#1F222A] rounded-[6px] p-[14px]">
              <Image
                src={nonogramImage}
                alt="Nonogram"
                width={101}
                height={101}
                className="w-[101px] h-[101px] object-contain"
              />
            </div>

            {/* Nonogram Title */}
            <h1 className="font-urbanist font-bold text-[30px] md:text-[48px] leading-[120%] text-center text-[#212121] dark:text-[#FAFAFA] transition-colors duration-300">
              NONOGRAM
            </h1>

            {/* Mode Indicator */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[13px] font-urbanist font-bold ${modeBgClass} ${modeColorClass} transition-all duration-300 mt-2`}>
              <ModeIcon size={14} />
              <span>{modeLabel}</span>
            </div>

            {/* Puzzle Navigation Buttons */}
            {dateParam && (
              <div className="flex items-center gap-4 mt-2">
                <button
                  onClick={() => {
                    const { hasPrev, prevDateStr } = getAdjacentDates(dateParam)
                    if (hasPrev) {
                      router.push(`${pathname}?date=${prevDateStr}`)
                    }
                  }}
                  disabled={!getAdjacentDates(dateParam).hasPrev}
                  className="px-3 py-1.5 rounded-full border border-[#6949FF] text-[#6949FF] hover:bg-[#6949FF] hover:text-white dark:hover:bg-[#6949FF] dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed text-[12px] font-urbanist font-bold transition-all duration-200 active:scale-95 flex items-center gap-1"
                >
                  &larr; Prev Puzzle
                </button>
                
                <span className="font-urbanist text-[13px] font-bold text-[#757575] dark:text-[#BDBDBD]">
                  {dateParam}
                </span>

                <button
                  onClick={() => {
                    const { hasNext, nextDateStr } = getAdjacentDates(dateParam)
                    if (hasNext) {
                      router.push(`${pathname}?date=${nextDateStr}`)
                    }
                  }}
                  disabled={!getAdjacentDates(dateParam).hasNext}
                  className="px-3 py-1.5 rounded-full border border-[#6949FF] text-[#6949FF] hover:bg-[#6949FF] hover:text-white dark:hover:bg-[#6949FF] dark:hover:text-white disabled:opacity-40 disabled:cursor-not-allowed text-[12px] font-urbanist font-bold transition-all duration-200 active:scale-95 flex items-center gap-1"
                >
                  Next Puzzle &rarr;
                </button>
              </div>
            )}

          </div>
        </div>
      </section>

      {/* Loading Overlay for Navigation */}
      <GameLoader isOpen={isNavigating} text="Back to lobby..." />
    </>
  )
}
