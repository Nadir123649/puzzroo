'use client'

import React, { useState, useRef, useEffect } from 'react'

interface DifficultyTabsProps {
  difficulties: string[]
}

export function DifficultyTabs({ difficulties }: DifficultyTabsProps) {
  const [selected, setSelected] = useState(0)
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 84 })
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([])
  const modes = difficulties.slice(0, 3)

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

  return (
    <div className="flex items-center justify-center gap-4">
      <span className="font-urbanist font-bold text-[16px] leading-[140%] tracking-[0.2px] text-[#424242] dark:text-[var(--color-light)]">
        Difficulty:
      </span>
      <div className="flex items-center gap-0 w-[253px] justify-between relative">
        {modes.map((difficulty, index) => (
          <button
            key={difficulty}
            ref={(el) => {
              buttonsRef.current[index] = el
            }}
            onClick={() => setSelected(index)}
            className="relative flex flex-col items-center gap-2 group z-10"
          >
            <span
              className={`font-urbanist font-bold text-[14px] md:text-[16px] transition-all duration-700 ease-in-out px-4 ${
                selected === index
                  ? 'text-[var(--color-primary)]'
                  : 'text-[#9E9E9E] group-hover:text-[#757575]'
              }`}
            >
              {difficulty}
            </span>
            {/* Grey background line */}
            <div className="grey-line w-[84px] md:w-[100px] h-[2px] bg-[#EEEEEE] rounded-full"></div>
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
