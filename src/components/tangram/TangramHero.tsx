'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Trophy, History, Gamepad2 } from 'lucide-react'
import { images } from '@/lib/utils'
import { GameLoader } from '@/components/ui/GameLoader'

interface TangramHeroProps {
  backTo?: string
}

export function TangramHero({ backTo }: TangramHeroProps = {}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname() || ''
  const [isNavigating, setIsNavigating] = useState(false)

  const tangramImage = images.gameCards.tangram

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
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const params = new URLSearchParams(window.location.search)
    const hasDate = params.has('date')
    
    const returnUrl = hasDate ? (typeof window !== 'undefined' ? sessionStorage.getItem('puzzroo_return_url') : null) : null
    if (returnUrl) {
      sessionStorage.removeItem('puzzroo_return_url')
      router.push(returnUrl)
    } else {
      router.push(backTo || '/game/tangram')
    }
  }

  return (
    <>
      <section className="w-full bg-white dark:bg-[#181A20] transition-colors duration-300 py-[10px] md:py-[15px]">
        <div className="w-full px-[20px]">
          {/* Back Arrow */}
          <div className="hidden sm:flex w-full items-center mb-2">
            <button
              onClick={handleBackClick}
              disabled={isNavigating}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-[var(--color-primary)] bg-white dark:bg-[#181A20] flex items-center justify-center p-2 hover:bg-[#F0EDFF] dark:hover:bg-[#35383F] transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
              aria-label="Back to games"
            >
              <ArrowLeft size={20} className="text-[var(--color-primary)]" strokeWidth={2.5} />
            </button>
          </div>

          <div className="flex flex-col items-center gap-4 md:gap-5">
            {/* Tangram Image with background */}
            <div className="w-[129px] h-[129px] relative flex items-center justify-center bg-[#F0EDFF] dark:bg-[#1F222A] rounded-[6px] p-[14px]">
              <Image
                src={tangramImage}
                alt="Tangram"
                width={101}
                height={101}
                className="w-[101px] h-[101px] object-contain"
              />
            </div>

            {/* Tangram Title */}
            <h1 className="font-urbanist font-bold text-[30px] md:text-[48px] leading-[120%] text-center text-[#212121] dark:text-[#FAFAFA] transition-colors duration-300">
              TANGRAM
            </h1>

            {/* Mode Indicator */}
            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[13px] font-urbanist font-bold ${modeBgClass} ${modeColorClass} transition-all duration-300 mt-2`}>
              <ModeIcon size={14} />
              <span>{modeLabel}</span>
            </div>

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

      {/* Loading Overlay */}
      <GameLoader isOpen={isNavigating} text="Back to lobby..." />
    </>
  )
}
