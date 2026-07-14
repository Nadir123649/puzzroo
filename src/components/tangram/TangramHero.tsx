'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft } from 'lucide-react'
import { images } from '@/lib/utils'
import { GameLoader } from '@/components/ui/GameLoader'

interface TangramHeroProps {
  backTo?: string
}

export function TangramHero({ backTo }: TangramHeroProps = {}) {
  const router = useRouter()
  const [isNavigating, setIsNavigating] = useState(false)

  const tangramImage = images.gameCards.tangram

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
          <button
            onClick={handleBackClick}
            disabled={isNavigating}
            className="md:fixed md:left-4 md:top-[100px] z-[50] mb-2 w-12 h-12 rounded-full border-2 border-[var(--color-primary)] bg-white dark:bg-[#181A20] flex items-center justify-center p-2 hover:bg-[#F0EDFF] dark:hover:bg-[#35383F] transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            aria-label="Back to games"
          >
            <ArrowLeft size={20} className="text-[var(--color-primary)]" strokeWidth={2.5} />
          </button>

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
          </div>
        </div>
      </section>

      {/* Loading Overlay */}
      <GameLoader isOpen={isNavigating} text="Back to lobby..." />
    </>
  )
}
