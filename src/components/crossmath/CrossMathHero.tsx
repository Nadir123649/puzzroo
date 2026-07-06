'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { images } from '@/lib/utils'
import { GameLoader } from '@/components/ui/GameLoader'

interface CrossMathHeroProps {
  backTo?: string // Optional custom back navigation path
}

export function CrossMathHero({ backTo }: CrossMathHeroProps = {}) {
  const router = useRouter()
  const [isNavigating, setIsNavigating] = useState(false)

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
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    const params = new URLSearchParams(window.location.search)
    const hasDate = params.has('date')
    
    const returnUrl = hasDate ? (typeof window !== 'undefined' ? sessionStorage.getItem('puzzroo_return_url') : null) : null
    if (returnUrl) {
      sessionStorage.removeItem('puzzroo_return_url')
      router.push(returnUrl)
    } else {
      router.push(backTo || '/game/cross-math')
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
            className="mb-2 w-12 h-12 rounded-full border-2 border-[var(--color-primary)] bg-white dark:bg-[#181A20] flex items-center justify-center p-2 hover:bg-[#F0EDFF] dark:hover:bg-[#35383F] transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            aria-label="Back to games"
          >
            <ArrowLeft size={20} className="text-[var(--color-primary)]" strokeWidth={2.5} />
          </button>

          <div className="flex flex-col items-center gap-4 md:gap-5">
            
            {/* CrossMath Image with background */}
            <div className="w-[129px] h-[129px] relative flex items-center justify-center bg-[#F0EDFF] dark:bg-[#1F222A] rounded-[6px] p-[14px]">
              <Image
                src="/cross-world.svg"
                alt="CrossMath"
                width={101}
                height={101}
                className="w-[101px] h-[101px] object-contain"
              />
            </div>

            {/* CrossMath Title */}
            <h1 className="font-urbanist font-bold text-[30px] md:text-[48px] leading-[120%] text-center text-[#212121] dark:text-[#FAFAFA] transition-colors duration-300">
              CROSS MATH
            </h1>

          </div>
        </div>
      </section>

      {/* Loading Overlay for Navigation */}
      <GameLoader isOpen={isNavigating} text="Back to lobby..." />
    </>
  )
}
