'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { useTheme } from '../../hooks/use-theme'
import { images } from '@/lib/utils'

export function Navbar() {
  const { theme, toggleTheme, mounted } = useTheme()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 w-full bg-white dark:bg-[#181A20] transition-colors duration-300 relative z-50">
      <div className="w-full px-[clamp(16px,4vw,80px)] py-[8px] md:py-[22px]">
        <div className="w-full flex items-center justify-between h-[48px]">

          {/* LEFT: Logo + Brand */}
          <div className="flex items-center gap-[clamp(8px,1vw,12px)] select-none">
            <Image
              src={images.logo}
              alt="Puzzroo Logo"
              width={32}
              height={32}
              className="w-6 h-6 md:w-8 md:h-8 rounded-lg"
              priority
            />

            <span className="font-urbanist text-[24px] font-extrabold text-[clamp(20px,2.5vw,40px)] tracking-tight text-[#181A20] dark:text-white transition-colors duration-300">
              Puzzroo
            </span>
          </div>

          {/* RIGHT: Desktop Actions */}
          <div className="hidden md:flex items-center gap-[clamp(8px,1vw,16px)]">

            <button className="h-[38px] px-[clamp(16px,2vw,24px)] rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white text-[16px] font-semibold font-urbanist transition-all duration-200 active:scale-95">
              Sign up
            </button>

            <button className="h-[38px] px-[clamp(16px,2vw,24px)] rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white text-[16px] font-semibold font-urbanist transition-all duration-200 active:scale-95">
              Login
            </button>

            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 h-[38px] px-[clamp(12px,2vw,16px)] rounded-full hover:opacity-80 transition-all duration-200 active:scale-95"
              aria-label="Toggle theme"
              suppressHydrationWarning
            >
              <Image
                src={images.darkIcon}
                alt="Theme icon"
                width={20}
                height={20}
                suppressHydrationWarning
                className={`w-5 h-5 select-none transition-transform duration-500 ${mounted && theme === 'light' ? 'scale-x-[-1]' : ''
                  }`}
              />
            </button>

          </div>

          {/* RIGHT: Mobile Actions - Theme + Hamburger */}
          <div className="flex md:hidden items-center">
            <button
              onClick={toggleTheme}
              className="flex items-center gap-1.5 h-[38px] px-2 rounded-full hover:opacity-80 transition-all duration-200 active:scale-95"
              aria-label="Toggle theme"
              suppressHydrationWarning
            >
              <Image
                src={images.darkIcon}
                alt="Theme icon"
                width={20}
                height={20}
                suppressHydrationWarning
                className={`w-5 h-5 select-none transition-transform duration-500 ${mounted && theme === 'light' ? 'scale-x-[-1]' : ''
                  }`}
              />
            </button>

            {/* Hamburger Menu */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg"
              aria-label="Toggle menu"
            >
              <div className="w-5 h-4 flex flex-col justify-between">
                <span className={`w-full h-0.5 bg-[#212121] dark:bg-white transition-all duration-300 ${isMenuOpen ? 'rotate-45 translate-y-2' : ''}`}></span>
                <span className={`w-full h-0.5 bg-[#212121] dark:bg-white transition-all duration-300 ${isMenuOpen ? 'opacity-0' : ''}`}></span>
                <span className={`w-full h-0.5 bg-[#212121] dark:bg-white transition-all duration-300 ${isMenuOpen ? '-rotate-45 -translate-y-2' : ''}`}></span>
              </div>
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white dark:bg-[#181A20] border-t border-gray-200 dark:border-gray-800 z-50 shadow-lg">
          <div className="flex flex-col items-center gap-4 py-6">
            <button className="w-[200px] h-[38px] rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white text-[14px] font-semibold font-urbanist transition-all active:scale-95 duration-200">
              Login
            </button>
            <button className="w-[200px] h-[38px] rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white text-[14px] font-semibold font-urbanist transition-all active:scale-95 duration-200">
              Sign up
            </button>
          </div>
        </div>
      )}
    </header>
  )
}

export default Navbar
