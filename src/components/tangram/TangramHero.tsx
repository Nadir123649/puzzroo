/**
 * Tangram Hero Component
 * Simple hero section with back navigation support
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { GameLoader } from '@/components/ui/GameLoader'

interface TangramHeroProps {
  backTo?: string
}

export function TangramHero({ backTo }: TangramHeroProps = {}) {
  const router = useRouter()
  const [isNavigating, setIsNavigating] = useState(false)

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
        <div className="w-full px-[20px] flex items-center justify-between relative">
          {/* Back Arrow */}
          <button
            onClick={handleBackClick}
            disabled={isNavigating}
            className="w-12 h-12 rounded-full border-2 border-[var(--color-primary)] bg-white dark:bg-[#181A20] flex items-center justify-center p-2 hover:bg-[#F0EDFF] dark:hover:bg-[#35383F] transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            aria-label="Back to games"
          >
            <ArrowLeft size={20} className="text-[var(--color-primary)]" strokeWidth={2.5} />
          </button>

          {/* Title */}
          <h1 className="font-urbanist font-extrabold text-[32px] md:text-[48px] leading-[120%] text-[#212121] dark:text-white absolute left-1/2 -translate-x-1/2 select-none">
            Tangram
          </h1>

          {/* Dummy spacer */}
          <div className="w-12 h-12" />
        </div>
      </section>

      {/* Loading Overlay */}
      <GameLoader isOpen={isNavigating} text="Back to lobby..." />
    </>
  )
}

export default TangramHero
