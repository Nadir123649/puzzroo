'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { GameLoader } from '@/components/ui/GameLoader'
import { DifficultyTabs } from './DifficultyTabs'
import { useTheme } from '@/hooks/use-theme'
import { useGameLobby } from '@/contexts/GameLobbyContext'
import { images } from '@/lib/utils'
import type { Difficulty } from '@shared/data/sudoku/types'
import { saveDifficultyPreference } from '@shared/lib/sudoku/storage'

interface GameHeroProps {
  name: string
  image: string
  imageLight?: string
  difficulties: string[]
  gameSlug?: string
}

// Countdown Timer Hook
function useCountdownToMidnight() {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 })

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date()
      const midnight = new Date()
      midnight.setHours(24, 0, 0, 0)
      
      const diff = midnight.getTime() - now.getTime()
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      
      setTimeLeft({ hours, minutes, seconds })
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 1000)
    
    return () => clearInterval(interval)
  }, [])

  return timeLeft
}

// Format current date
function useCurrentDate() {
  const [dateString, setDateString] = useState('')

  useEffect(() => {
    const now = new Date()
    const day = now.getDate()
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    const month = months[now.getMonth()]
    const year = now.getFullYear()
    
    setDateString(`${day} ${month} ${year}`)
  }, [])

  return dateString
}

export function GameHero({ name, image, imageLight, difficulties, gameSlug }: GameHeroProps) {
  const { theme } = useTheme()
  const router = useRouter()
  const { setSelectedDifficulty } = useGameLobby()
  const [isLoading, setIsLoading] = useState(false)
  const [localDifficulty, setLocalDifficulty] = useState<Difficulty>('easy')
  const timeLeft = useCountdownToMidnight()
  const currentDate = useCurrentDate()
  
  // Always reset to Easy on mount and update context
  useEffect(() => {
    setLocalDifficulty('easy')
    setSelectedDifficulty('easy')
    saveDifficultyPreference('easy')
  }, [])

  // Lock body scroll when loading overlay is active
  useEffect(() => {
    if (isLoading) {
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
  }, [isLoading])
  
  const currentImage = theme === 'light' && imageLight ? imageLight : image
  
  // Check if this is Sudoku, CrossMath, Nonogram, or Tangram to link to the actual game page
  const isSudoku = name.toLowerCase() === 'sudoku'
  const isCrossMath = name.toLowerCase() === 'cross math' || name.toLowerCase() === 'cross-math' || name.toLowerCase() === 'crossmath'
  const isNonogram = name.toLowerCase() === 'nonogram'
  const isTangram = name.toLowerCase() === 'tangram'
  const playUrl = isSudoku ? '/sudoku' : isCrossMath ? '/cross-math' : isNonogram ? '/nonogram' : isTangram ? '/tangram' : '#'

  const handleDifficultyChange = (difficulty: Difficulty) => {
    setLocalDifficulty(difficulty)
    setSelectedDifficulty(difficulty)
    saveDifficultyPreference(difficulty)
  }

  const handlePlayClick = async (e: React.MouseEvent) => {
    if (isSudoku || isCrossMath || isNonogram || isTangram) {
      e.preventDefault()
      setIsLoading(true)
      // Show loading for 1 second
      await new Promise(resolve => setTimeout(resolve, 1000))
      router.push(`${playUrl}?difficulty=${localDifficulty.toLowerCase()}`)
    }
  }

  return (
    <>
      <section className="w-full bg-white dark:bg-[#181A20] transition-colors duration-300 pt-12 md:pt-16 pb-12 relative">
        <div className="w-full px-[20px]">
          <div className="flex flex-col items-center gap-5 md:gap-6">
            
            {/* Game Image with background */}
            <div className="w-[129px] h-[129px] relative flex items-center justify-center bg-[#F0EDFF] dark:bg-[#1F222A] rounded-[6px] p-[14px]">
              <Image
                src={currentImage}
                alt={name}
                width={101}
                height={101}
                className="w-[101px] h-[101px] object-contain"
              />
            </div>

            {/* Game Title */}
            <h1 className="font-urbanist font-bold text-[30px] md:text-[48px] leading-[120%] text-center text-[#212121] dark:text-white transition-colors duration-300">
              {name}
            </h1>

            {/* Difficulty Tabs */}
            <DifficultyTabs 
              difficulties={difficulties}
              selectedDifficulty={localDifficulty}
              onDifficultyChange={handleDifficultyChange}
            />

            {/* Play Button with Icon */}
            {(isSudoku || isCrossMath || isNonogram || isTangram) ? (
              <button
                onClick={handlePlayClick}
                disabled={isLoading}
                className="w-full max-w-[382px] h-[46px] rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-urbanist font-semibold text-[16px] transition-all duration-200 active:scale-95 px-4 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <span>Play</span>
                    <span className="text-white text-[10px] w-[10px] h-[10px] flex items-center justify-center">▶</span>
                  </>
                )}
              </button>
            ) : (
              <button className="w-full max-w-[382px] h-[46px] rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-urbanist font-semibold text-[16px] transition-all duration-200 active:scale-95 px-4 flex items-center justify-center gap-2">
                <span>Play</span>
                <span className="text-white text-[10px] w-[10px] h-[10px] flex items-center justify-center">▶</span>
              </button>
            )}

            {/* OR Divider */}
            <div className="w-full max-w-[382px] flex items-center justify-center">
              <span className="font-urbanist font-medium text-[14px] text-[#757575] dark:text-[#BDBDBD]">OR</span>
            </div>

            {/* Daily Challenge Button - Full Width */}
            <Link href={`/daily-challenge/${isSudoku ? 'sudoku' : isCrossMath ? 'cross-math' : isNonogram ? 'nonogram' : isTangram ? 'tangram' : 'sudoku'}`} className="w-full max-w-[382px]">
              <button className="w-full h-[46px] rounded-full border-2 border-[#6949FF] bg-[#6949FF] hover:bg-[#5536E6] hover:border-[#5536E6] text-white font-urbanist font-semibold text-[16px] transition-all duration-200 active:scale-95">
                Daily Challenge
              </button>
            </Link>

            {/* Past Puzzles Button - Full Width */}
            <Link href={`/past-puzzles/${isSudoku ? 'sudoku' : isCrossMath ? 'cross-math' : isNonogram ? 'nonogram' : isTangram ? 'tangram' : 'sudoku'}`} className="w-full max-w-[382px]">
              <button className="w-full h-[46px] rounded-full border-2 border-[#6949FF] bg-white dark:bg-[#1F222A] hover:bg-[#6949FF] dark:hover:bg-[#6949FF] text-[#6949FF] hover:text-white font-urbanist font-semibold text-[16px] transition-all duration-200 active:scale-95">
                Past Puzzles
              </button>
            </Link>

          </div>
        </div>

        {/* Loading Overlay */}
        <GameLoader isOpen={isLoading} text="Loading game..." />
      </section>
    </>
  )
}
