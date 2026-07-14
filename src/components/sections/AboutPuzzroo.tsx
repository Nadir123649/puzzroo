'use client'

import Image from 'next/image'
import { images } from '@/lib/utils'

export function AboutPuzzroo() {
  return (
    <section className="w-full bg-white dark:bg-[#181A20] transition-colors duration-300 py-10 md:py-14">
      <div className="w-full px-[20px]">
        {/* Background Container with Purple Gradient and Feature Background */}
        <div className="relative bg-gradient-to-br from-[#6949FF] to-[#8B5CF6] rounded-[20px] py-8 md:py-10 px-5 md:px-10 overflow-hidden max-w-[1100px] mx-auto">
          
          {/* Feature Background Image */}
          <div className="absolute inset-0 w-full h-full pointer-events-none z-[3]">
            <Image
              src={images.featureBackground}
              alt="Background Pattern"
              fill
              priority
              className="object-cover object-center opacity-30"
            />
          </div>

          {/* Decorative Background Pattern */}
          <div className="absolute inset-0 opacity-10 z-[2]">
            <div className="absolute top-10 right-10 w-32 h-32 border-4 border-white rounded-full"></div>
            <div className="absolute bottom-10 left-10 w-24 h-24 border-4 border-white rounded-full"></div>
            <div className="absolute top-1/2 left-1/3 w-16 h-16 border-4 border-white rounded-full"></div>
          </div>

          <div className="relative z-10 w-full max-w-[1000px] mx-auto flex flex-col gap-3 text-center">
            
            {/* Logo Icon */}
            <div className="flex justify-center">
              <div className="w-8 h-8 md:w-14 md:h-14 bg-white rounded-xl p-2 md:p-2.5 shadow-md">
                <Image
                  src={images.logo}
                  alt="Puzzroo Logo"
                  width={72}
                  height={72}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Heading */}
            <h2 className="font-urbanist font-bold text-[24px] md:text-[38px] leading-[120%] text-white">
              About Puzzroo
            </h2>

            {/* Body Copy */}
            <p className="font-urbanist font-medium text-[14px] md:text-[16px] leading-[160%] text-white/95 max-w-[850px] mx-auto">
              Puzzroo is a premium destination for puzzle enthusiasts who want more than simple entertainment. Our platform combines strategic thinking, logic training, and cognitive challenges through expertly designed experiences such as Sudoku, CrossMath, and other skill-building puzzle formats. Every challenge is created to improve concentration, strengthen memory, enhance problem-solving abilities, and support long-term mental performance while delivering an engaging and rewarding experience.
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 md:gap-6 mt-4 max-w-[700px] mx-auto">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 md:p-5">
                <div className="font-urbanist font-bold text-[16px] md:text-[28px] text-white">15K+</div>
                <div className="font-urbanist font-medium text-[10px] md:text-[12px] text-white/80">Active Players</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 md:p-5">
                <div className="font-urbanist font-bold text-[16px] md:text-[28px] text-white">6</div>
                <div className="font-urbanist font-medium text-[10px] md:text-[12px] text-white/80">Puzzle Games</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 md:p-5">
                <div className="font-urbanist font-bold text-[16px] md:text-[28px] text-white">100%</div>
                <div className="font-urbanist font-medium text-[10px] md:text-[12px] text-white/80">Ad-Free</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  )
}
