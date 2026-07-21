'use client'

import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { images } from '@/lib/utils'
import { Settings, Gamepad2 } from 'lucide-react'

interface ChessHeroProps {
  selectedDifficulty: string
  boardThemeName?: string
}

export function ChessHero({ selectedDifficulty }: ChessHeroProps) {
  const diffLabel = selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1) + ' Mode'

  return (
    <section className="w-full bg-white dark:bg-[#181A20] transition-colors duration-300 pt-2 pb-2 px-3">
      <div className="w-full max-w-[1380px] mx-auto flex items-center justify-between gap-3 bg-[#F0EDFF] dark:bg-[#1F222A] rounded-xl px-4 py-2 border border-[#E0D9FF] dark:border-[#35383F]">
        {/* Title & Tagline */}
        <div className="flex items-center gap-2">
          <h1 className="font-urbanist font-extrabold text-lg sm:text-xl text-[#181A20] dark:text-white tracking-tight">
            PUZZROO CHESS
          </h1>
          <Image
            src={images.starIcon}
            alt="Star Icon"
            width={18}
            height={18}
            className="w-4 h-4 select-none flex-shrink-0"
          />
          <span className="hidden md:inline-block text-xs font-urbanist text-[#757575] dark:text-[#BDBDBD] ml-2 border-l border-gray-300 dark:border-gray-700 pl-3">
            Play, Learn & Master Chess
          </span>
        </div>

        {/* Match Info & Change Setup Button */}
        <div className="flex items-center gap-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-[#262A34] border border-gray-200 dark:border-gray-700 text-xs font-urbanist font-bold text-[#6949FF] shadow-sm">
            <Gamepad2 size={13} />
            <span>{diffLabel}</span>
          </div>

          <Link
            href="/chess/setup"
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white text-xs font-urbanist font-bold transition-all duration-200 active:scale-95 shadow-sm"
          >
            <Settings size={13} />
            <span>Setup</span>
          </Link>
        </div>
      </div>
    </section>
  )
}

export default ChessHero
