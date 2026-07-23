'use client'

import React, { useEffect } from 'react'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'
import { images } from '@/lib/utils'

interface GameLoaderProps {
  isOpen: boolean
  text?: string
}

export function GameLoader({ isOpen, text = 'Loading...' }: GameLoaderProps) {
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      document.body.style.overflowY = 'hidden'
      document.body.style.touchAction = 'none'
      document.documentElement.style.overflow = 'hidden'
      document.documentElement.style.overflowY = 'hidden'
      document.documentElement.style.touchAction = 'none'
      document.documentElement.style.scrollbarGutter = 'auto'
      document.body.style.scrollbarGutter = 'auto'
    } else {
      document.body.style.overflow = ''
      document.body.style.overflowY = ''
      document.body.style.touchAction = ''
      document.documentElement.style.overflow = ''
      document.documentElement.style.overflowY = ''
      document.documentElement.style.touchAction = ''
      document.documentElement.style.scrollbarGutter = ''
      document.body.style.scrollbarGutter = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.overflowY = ''
      document.body.style.touchAction = ''
      document.documentElement.style.overflow = ''
      document.documentElement.style.overflowY = ''
      document.documentElement.style.touchAction = ''
      document.documentElement.style.scrollbarGutter = ''
      document.body.style.scrollbarGutter = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-white/80 dark:bg-[#181A20]/80 backdrop-blur-sm z-[99999] flex items-center justify-center transition-opacity duration-300">
      <div className="flex flex-col items-center gap-4 text-center select-none pointer-events-auto">
        {/* Puzzroo Logo & Brand */}
        <div className="flex items-center gap-[clamp(8px,1vw,12px)] select-none">
          <Image
            src={images.logo}
            alt="Puzzroo Logo"
            width={32}
            height={32}
            className="w-6 h-6 md:w-8 md:h-8 rounded-lg animate-pulse"
            priority
          />
          <span className="font-urbanist text-[20px] md:text-[24px] font-extrabold tracking-tight text-[#181A20] dark:text-white transition-colors duration-300">
            Puzzroo
          </span>
        </div>
        
        {/* Loading Spinner */}
        <Loader2 className="animate-spin text-[var(--color-primary)] mt-2" size={40} />
        
        {/* Loading Text */}
        <p className="font-urbanist text-base font-semibold text-[var(--color-primary)] animate-pulse mt-1">
          {text}
        </p>
      </div>
    </div>
  )
}

export default GameLoader
