'use client'

import React, { useState, useRef, useEffect } from 'react'
import type { Difficulty } from '@/data/sudoku/types'

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
  const modes = difficulties.slice(0, 3)
  
  // Find initial selected index based on selectedDifficulty
  const getInitialIndex = () => {
    if (!selectedDifficulty) return 0
    const index = modes.findIndex(
      (d) => d.toLowerCase() === selectedDifficulty.toLowerCase()
    )
    return index >= 0 ? index : 0
  }
  
  const [selected, setSelected] = useState(getInitialIndex)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 84 })
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([])

  // Update selected index when selectedDifficulty prop changes
  useEffect(() => {
    const newIndex = getInitialIndex()
    if (newIndex !== selected) {
      setSelected(newIndex)
    }
  }, [selectedDifficulty])

  useEffect(() => {
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
  }, [selected])

  const handleClick = (index: number) => {
    setSelected(index)
    if (onDifficultyChange) {
      const difficulty = modes[index].toLowerCase() as Difficulty
      onDifficultyChange(difficulty)
    }
  }

  return (
    <div className="flex flex-row flex-wrap items-center gap-3 sm:gap-4 w-full sm:w-auto px-4 sm:px-0">
      <span className="font-urbanist font-bold text-[15px] sm:text-[16px] leading-[140%] tracking-[0.2px] text-[#424242] dark:text-[var(--color-light)] whitespace-nowrap flex-shrink-0">
        Difficulty:
      </span>
      <div className="flex items-center gap-0 flex-1 sm:w-[253px] sm:flex-none justify-between relative">
        {modes.map((difficulty, index) => (
          <button
            key={difficulty}
            ref={(el) => {
              buttonsRef.current[index] = el
            }}
            onClick={() => handleClick(index)}
            className="relative flex flex-col items-center gap-1.5 group z-10 flex-1 sm:flex-none"
          >
            <span
              className={`font-urbanist font-bold text-[12px] sm:text-[13px] md:text-[14px] transition-all duration-700 ease-in-out px-1.5 sm:px-3 ${
                selected === index
                  ? 'text-[var(--color-primary)]'
                  : 'text-[#9E9E9E] group-hover:text-[#757575]'
              }`}
            >
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </span>
            {/* Grey background line */}
            <div className="grey-line w-[78px] sm:w-[80px] md:w-[84px] h-[2px] bg-[#EEEEEE] rounded-full"></div>
          </button>
        ))}
        
        {/* Purple sliding line - positioned absolutely to slide between tabs */}
        <div 
          className="absolute h-[4px] bg-[var(--color-primary)] rounded-full transition-all duration-700 ease-in-out pointer-events-none z-20"
          style={{ 
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
            bottom: '-1px', // Positions 4px line centered over 2px grey (1px above, 1px below grey line)
          }}
        ></div>
      </div>
    </div>
  )
}
