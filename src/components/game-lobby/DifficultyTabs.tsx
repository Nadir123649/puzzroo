'use client'

import React, { useState } from 'react'

interface DifficultyTabsProps {
  difficulties: string[]
}

export function DifficultyTabs({ difficulties }: DifficultyTabsProps) {
  const [selected, setSelected] = useState(difficulties[0])

  return (
    <div className="flex items-center justify-center gap-4">
      <span className="font-urbanist font-bold text-[16px] leading-[140%] tracking-[0.2px] text-[#424242] dark:text-[var(--color-light)]">
        Difficulty:
      </span>
      <div className="flex items-center gap-0 w-[253px] justify-between">
        {difficulties.slice(0, 3).map((difficulty, index) => (
          <button
            key={difficulty}
            onClick={() => setSelected(difficulty)}
            className="relative flex flex-col items-center gap-2"
          >
            <span
              className={`font-urbanist font-semibold text-[14px] md:text-[16px] transition-all duration-200 px-4 ${
                selected === difficulty
                  ? 'text-[var(--color-primary)]'
                  : 'text-[#9E9E9E]'
              }`}
            >
              {difficulty}
            </span>
            <div
              className={`transition-all duration-200 ${
                selected === difficulty
                  ? 'w-[84px] md:w-[100.33px] h-[4px] bg-[var(--color-primary)]'
                  : 'w-[84px] md:w-[100px] h-[2px] bg-[#EEEEEE]'
              }`}
              style={{ borderRadius: '100px' }}
            ></div>
          </button>
        ))}
      </div>
    </div>
  )
}
