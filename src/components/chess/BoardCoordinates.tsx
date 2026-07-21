'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface BoardCoordinatesProps {
  label: string
  type: 'rank' | 'file'
  position?: 'top' | 'bottom' | 'left' | 'right' | 'inside'
  className?: string
  style?: React.CSSProperties
}

export function BoardCoordinates({ label, type, position = 'inside', className, style }: BoardCoordinatesProps) {
  if (position === 'inside') {
    return (
      <span
        style={style}
        className={cn(
          'absolute text-[9px] sm:text-[11px] md:text-[12px] font-urbanist font-extrabold select-none opacity-80 pointer-events-none z-10',
          type === 'rank' ? 'top-0.5 left-1 sm:top-1 sm:left-1.5' : 'bottom-0.5 right-1 sm:bottom-1 sm:right-1.5',
          className
        )}
      >
        {label}
      </span>
    )
  }

  return (
    <div
      style={style}
      className={cn(
        'flex items-center justify-center font-urbanist font-bold text-[10px] sm:text-[12px] md:text-[14px] text-[#757575] dark:text-[#BDBDBD] select-none',
        type === 'rank' ? 'w-4 sm:w-6 h-full' : 'h-4 sm:h-6 w-full',
        className
      )}
    >
      {label}
    </div>
  )
}

export default BoardCoordinates
