'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { images } from '@/lib/utils'

export function SudokuHero() {
  const router = useRouter()
  const [isNavigating, setIsNavigating] = useState(false)

  const handleBackClick = async () => {
    setIsNavigating(true)
    // Show loading for 1 second
    await new Promise(resolve => setTimeout(resolve, 1000))
    router.push('/game/sudoku')
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
            <h1 className="font-urbanist font-bold text-[48px] leading-[120%] text-center text-[#212121] dark:text-[#FAFAFA] transition-colors duration-300">
              SUDOKU
            </h1>

          </div>
        </div>
      </section>

      {/* Loading Overlay for Navigation */}
      {isNavigating && (
        <div className="fixed inset-0 bg-white/80 dark:bg-[#181A20]/80 backdrop-blur-sm z-50">
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-4">
            {/* Puzzroo Logo + Text */}
            <div className="flex items-center gap-3">
              <Image
                src={images.logo}
                alt="Puzzroo Logo"
                width={40}
                height={40}
                className="w-10 h-10 rounded-lg"
              />
              <span className="font-urbanist text-[32px] font-extrabold tracking-tight text-[#181A20] dark:text-white">
                Puzzroo
              </span>
            </div>
            
            <Loader2 className="animate-spin text-[var(--color-primary)]" size={48} />
          </div>
        </div>
      )}
    </>
  )
}
