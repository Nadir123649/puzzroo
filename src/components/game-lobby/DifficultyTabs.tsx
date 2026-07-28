'use client'

import React, { useState, useRef, useEffect } from 'react'
import type { Difficulty } from '@shared/data/sudoku/types'

interface DifficultyTabsProps {
  difficulties: string[]
  selectedDifficulty?: Difficulty
  onDifficultyChange?: (difficulty: Difficulty) => void
}

export function DifficultyTabs({ 
  difficulties, 
  selectedDifficulty,
  onDifficultyChange 
}: DifficultyTabsProps) {
  const modes = difficulties
  
  const getInitialIndex = () => {
    if (!selectedDifficulty) return 0
    const index = modes.findIndex(
      (d) => d.toLowerCase() === selectedDifficulty.toLowerCase()
    )
    return index >= 0 ? index : 0
  }
  
  // Initialize with 0 to avoid hydration mismatch, then update in useEffect
  const [selected, setSelected] = useState(0)
  const [mounted, setMounted] = useState(false)
  // Start as null to avoid SSR/client mismatch — only set after mount
  const [indicatorStyle, setIndicatorStyle] = useState<{ left: number; width: number } | null>(null)
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([])

  // Set correct initial index after mount
  useEffect(() => {
    setMounted(true)
    const initialIndex = getInitialIndex()
    setSelected(initialIndex)
  }, [])

  useEffect(() => {
    if (!mounted) return
    const newIndex = getInitialIndex()
    if (newIndex !== selected) {
      setSelected(newIndex)
    }
  }, [selectedDifficulty, mounted])

  useEffect(() => {
    if (!mounted) return
    
    const updateIndicator = () => {
      const button = buttonsRef.current[selected]
      if (button) {
        const line = button.querySelector('.grey-line') as HTMLElement
        if (line) {
          const parentRect = button.parentElement?.getBoundingClientRect()
          const lineRect = line.getBoundingClientRect()
          if (parentRect) {
            setIndicatorStyle({
              left: lineRect.left - parentRect.left,
              width: lineRect.width
            })
          }
        }
      }
    }

    updateIndicator()
    window.addEventListener('resize', updateIndicator)
    return () => window.removeEventListener('resize', updateIndicator)
  }, [selected, mounted])

  const handleClick = (index: number) => {
    setSelected(index)
    if (onDifficultyChange) {
      const difficulty = modes[index].toLowerCase() as Difficulty
      onDifficultyChange(difficulty)
    }
  }

  return (
    <div className="flex flex-row flex-wrap items-center justify-center gap-3 sm:gap-4 w-full">
      <span className="font-urbanist font-bold text-[15px] sm:text-[16px] leading-[140%] tracking-[0.2px] text-[#424242] dark:text-[var(--color-light)] whitespace-nowrap flex-shrink-0">
        Difficulty:
      </span>
      {/* Container: fit-content so no blank space on either side */}
      <div className="flex items-center gap-0 w-auto relative">
        {/* Continuous grey line in background */}
        <div className="absolute left-0 right-0 h-[2px] bg-[#EEEEEE] rounded-full z-0" style={{ bottom: '0px' }}></div>
        {modes.map((difficulty, index) => (
          <button
            key={difficulty}
            ref={(el) => {
              buttonsRef.current[index] = el
            }}
            onClick={() => handleClick(index)}
            className="relative flex flex-col items-center gap-1.5 group z-10"
          >
            <span
              className={`font-urbanist font-bold text-[12px] sm:text-[13px] md:text-[14px] transition-all duration-700 ease-in-out px-4 sm:px-6 ${
                selected === index
                  ? 'text-[var(--color-primary)]'
                  : 'text-[#9E9E9E] group-hover:text-[#757575]'
              }`}
            >
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </span>
            {/* Invisible spacer that the sliding indicator measures against */}
            <div className="grey-line w-full h-0 opacity-0"></div>
          </button>
        ))}
        
        {/* Purple sliding line — only rendered client-side after measuring to avoid hydration mismatch */}
        {indicatorStyle !== null && (
          <div 
            className="absolute h-[4px] bg-[var(--color-primary)] rounded-full transition-all duration-700 ease-in-out pointer-events-none z-20"
            style={{ 
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
              bottom: '-1px',
            }}
          />
        )}
      </div>
    </div>
  )
}
