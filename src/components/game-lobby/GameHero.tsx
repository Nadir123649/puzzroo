'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { DifficultyTabs } from './DifficultyTabs'
import { useTheme } from '@/hooks/use-theme'
import { images } from '@/lib/utils'
import type { Difficulty } from '@/data/sudoku/types'
import { saveDifficultyPreference, loadDifficultyPreference } from '@/lib/sudoku/storage'

interface GameHeroProps {
  name: string
  image: string
  imageLight?: string
  difficulties: string[]
}

export function GameHero({ name, image, imageLight, difficulties }: GameHeroProps) {
  const { theme } = useTheme()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>(() => 
    loadDifficultyPreference()
  )
  
  const currentImage = theme === 'light' && imageLight ? imageLight : image
  
  // Check if this is Sudoku to link to the actual game page
  const isSudoku = name.toLowerCase() === 'sudoku'
  const playUrl = isSudoku ? '/sudoku' : '#'

  const handleDifficultyChange = (difficulty: Difficulty) => {
    setSelectedDifficulty(difficulty)
    saveDifficultyPreference(difficulty)
  }

  const handlePlayClick = async (e: React.MouseEvent) => {
    if (isSudoku) {
      e.preventDefault()
      setIsLoading(true)
      // Show loading for 2-3 seconds
      await new Promise(resolve => setTimeout(resolve, 2500))
      router.push(playUrl)
    }
  }

  return (
    <>
      <section className="w-full bg-white dark:bg-[#181A20] transition-colors duration-300 py-12 md:py-16 relative">
        <div className="w-full px-[20px]">
          <div className="flex flex-col items-center gap-8 md:gap-10">
            
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
            <h1 className="font-urbanist font-bold text-[48px] leading-[120%] text-center text-[#212121] dark:text-white transition-colors duration-300">
              {name}
            </h1>

            {/* Difficulty Tabs */}
            <DifficultyTabs 
              difficulties={difficulties}
              selectedDifficulty={selectedDifficulty}
              onDifficultyChange={handleDifficultyChange}
            />

            {/* Play Button with Icon */}
            {isSudoku ? (
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

          </div>
        </div>

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-[#181A20]/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="flex flex-col items-center gap-4">
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
              <p className="font-urbanist text-lg font-semibold text-[var(--color-primary)]">
                Loading Game...
              </p>
            </div>
          </div>
        )}
      </section>
    </>
  )
}
