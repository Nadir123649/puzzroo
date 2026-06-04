'use client'

import React from 'react'
import Image from 'next/image'
import { images } from '@/lib/utils'

export function Hero() {
  return (
    <section
      id="hero"
      className="w-full bg-white dark:bg-[#181A20] transition-colors duration-300"
    >
      <div className="w-full px-[20px]">
        {/* Desktop Hero Image */}
        <div className="hidden md:block relative w-full aspect-[1322/352] overflow-hidden rounded-xl sm:rounded-2xl md:rounded-[12px] shadow-lg shadow-purple-500/5 dark:shadow-none hover:shadow-xl hover:shadow-purple-500/10 dark:hover:shadow-none transition-all duration-300">
          <Image
            src={images.heroImage}
            alt={images.heroImageAlt}
            width={0}
            height={0}
            sizes="100vw"
            className="w-full h-auto object-cover select-none"
            priority
          />
        </div>

        {/* Mobile Hero Image */}
        {/* Mobile Hero Image */}
        <div className="block md:hidden relative w-full h-[152px] overflow-hidden rounded-xl">
          <Image
            src={images.heroImage}
            alt={images.heroImageAlt}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
        </div>
      </div>
    </section>
  )
}

export default Hero