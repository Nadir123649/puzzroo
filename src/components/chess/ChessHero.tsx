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

export function ChessHero({ selectedDifficulty, boardThemeName = 'Classic Wood' }: ChessHeroProps) {
  const diffLabel = selectedDifficulty.charAt(0).toUpperCase() + selectedDifficulty.slice(1) + ' Match'

  return (
    <section className="w-full bg-white dark:bg-[#181A20] transition-colors duration-300 pt-4 pb-6 md:py-8">
      <div className="w-full px-[20px]">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8 bg-[#F0EDFF] dark:bg-[#1F222A] rounded-[16px] md:rounded-[24px] p-4 sm:p-6 md:p-8 border border-[#E0D9FF] dark:border-[#35383F]">
          {/* Title & Description */}
          <div className="flex flex-col gap-2 max-w-xl text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2.5">
              <h1 className="font-urbanist font-extrabold text-2xl sm:text-3xl md:text-4xl text-[#181A20] dark:text-white">
                CHESS MATCH
              </h1>
              <Image
                src={images.starIcon}
                alt="Star Icon"
                width={24}
                height={24}
                className="w-6 h-6 select-none flex-shrink-0"
              />
            </div>
            <p className="font-urbanist text-sm sm:text-base text-[#757575] dark:text-[#BDBDBD]">
              Master the classic game of strategy. Outmaneuver your opponent and checkmate the king!
            </p>
          </div>

          {/* Match Info & Change Setup Button */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Active Match Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#262A34] border border-gray-200 dark:border-gray-700 text-xs font-urbanist font-bold text-[#6949FF] shadow-sm">
              <Gamepad2 size={15} />
              <span>{diffLabel}</span>
            </div>

            {/* Change Setup Link */}
            <Link
              href="/chess/setup"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white text-xs font-urbanist font-bold transition-all duration-200 active:scale-95 shadow-sm"
            >
              <Settings size={14} />
              <span>Change Setup</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ChessHero
