'use client'

import React from 'react'
import Image from 'next/image'

export function SudokuHero() {
  return (
    <section className="w-full bg-white dark:bg-[#181A20] transition-colors duration-300 py-12 md:py-16">
      <div className="w-full px-[clamp(16px,4vw,80px)]">
        <div className="flex flex-col items-center gap-8 md:gap-10">
          
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
  )
}
