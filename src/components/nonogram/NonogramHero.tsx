'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
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
      <GameLoader isOpen={isNavigating} text="Back to lobby..." />
    </>
  )
}
