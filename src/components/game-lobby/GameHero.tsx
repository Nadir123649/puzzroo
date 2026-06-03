'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { DifficultyTabs } from './DifficultyTabs'
import { useTheme } from '@/hooks/use-theme'

interface GameHeroProps {
  name: string
  image: string
  imageLight?: string
  difficulties: string[]
}

export function GameHero({ name, image, imageLight, difficulties }: GameHeroProps) {
  const { theme } = useTheme()
  
  const currentImage = theme === 'light' && imageLight ? imageLight : image
  
  // Check if this is Sudoku to link to the actual game page
  const isSudoku = name.toLowerCase() === 'sudoku'
  const playUrl = isSudoku ? '/sudoku' : '#'

  return (
    <section className="w-full bg-white dark:bg-[#181A20] transition-colors duration-300 py-12 md:py-16">
      <div className="w-full px-[clamp(16px,4vw,80px)]">
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
          <DifficultyTabs difficulties={difficulties} />

          {/* Play Button with Icon */}
          {isSudoku ? (
            <Link 
              href={playUrl}
              className="w-full max-w-[382px] h-[46px] rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-urbanist font-semibold text-[16px] transition-all duration-200 active:scale-95 px-4 flex items-center justify-center gap-2"
            >
              <span>Play</span>
              <span className="text-white text-[10px] w-[10px] h-[10px] flex items-center justify-center">▶</span>
            </Link>
          ) : (
            <button className="w-full max-w-[382px] h-[46px] rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-urbanist font-semibold text-[16px] transition-all duration-200 active:scale-95 px-4 flex items-center justify-center gap-2">
              <span>Play</span>
              <span className="text-white text-[10px] w-[10px] h-[10px] flex items-center justify-center">▶</span>
            </button>
          )}

        </div>
      </div>
    </section>
  )
}
