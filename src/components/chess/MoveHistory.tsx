'use client'

import React, { useRef, useEffect } from 'react'
import { MoveRecord } from '@/hooks/useChess'
import { cn } from '@/lib/utils'

interface MoveHistoryProps {
  moves?: MoveRecord[]
  reviewIndex?: number | null
  onReviewMove?: (index: number | null) => void
  className?: string
}

export function MoveHistory({ moves = [], reviewIndex = null, onReviewMove, className }: MoveHistoryProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new moves are added
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [moves.length])

  // Group moves into pairs (White & Black) for turn rows
  const movePairs: { turnNumber: number; whiteIndex: number; whiteSan: string; blackIndex?: number; blackSan?: string }[] = []
  for (let i = 0; i < moves.length; i += 2) {
    const turnNumber = Math.floor(i / 2) + 1
    const whiteSan = moves[i].san
    const blackSan = moves[i + 1] ? moves[i + 1].san : undefined
    movePairs.push({
      turnNumber,
      whiteIndex: i,
      whiteSan,
      blackIndex: moves[i + 1] ? i + 1 : undefined,
      blackSan,
    })
  }

  return (
    <div
      className={cn(
        'w-full bg-[#F0EDFF] dark:bg-[#1F222A] rounded-xl sm:rounded-2xl p-3.5 sm:p-4 border border-[#E0D9FF] dark:border-[#35383F] flex flex-col gap-2.5 h-[220px] sm:h-[240px] overflow-hidden shadow-sm',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-[#6949FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h4 className="font-urbanist font-bold text-sm sm:text-base text-[#212121] dark:text-[#FAFAFA]">
            Match Notation
          </h4>
        </div>

        <div className="flex items-center gap-2">
          {reviewIndex !== null && (
            <button
              onClick={() => onReviewMove?.(null)}
              className="text-[11px] font-urbanist font-bold text-[#6949FF] hover:underline"
            >
              Live Board
            </button>
          )}
          <span className="text-xs font-urbanist font-semibold text-[#757575] dark:text-[#BDBDBD]">
            {moves.length} moves
          </span>
        </div>
      </div>

      {/* Move History Table / List */}
      {moves.length > 0 ? (
        <div
          ref={containerRef}
          className="flex-grow overflow-y-auto pr-1 flex flex-col gap-1 custom-scrollbar"
        >
          <div className="grid grid-cols-3 text-xs font-urbanist font-bold text-[#757575] dark:text-[#BDBDBD] px-2 py-1 bg-white/50 dark:bg-[#262A34]/50 rounded-md">
            <span>#</span>
            <span>White</span>
            <span>Black</span>
          </div>

          {movePairs.map((pair) => (
            <div
              key={pair.turnNumber}
              className="grid grid-cols-3 text-xs sm:text-sm font-urbanist font-semibold text-[#212121] dark:text-[#FAFAFA] px-2 py-1 rounded-md hover:bg-white/70 dark:hover:bg-[#262A34]/70 transition-colors"
            >
              <span className="text-[#757575] dark:text-[#BDBDBD]">
                {pair.turnNumber}.
              </span>

              {/* White Move */}
              <button
                onClick={() => onReviewMove?.(pair.whiteIndex)}
                className={cn(
                  'text-left font-mono font-semibold px-1 rounded hover:text-[#6949FF] transition-colors',
                  reviewIndex === pair.whiteIndex && 'bg-[#6949FF] text-white'
                )}
              >
                {pair.whiteSan}
              </button>

              {/* Black Move */}
              {pair.blackSan !== undefined && pair.blackIndex !== undefined ? (
                <button
                  onClick={() => onReviewMove?.(pair.blackIndex!)}
                  className={cn(
                    'text-left font-mono font-semibold px-1 rounded hover:text-[#6949FF] transition-colors',
                    reviewIndex === pair.blackIndex && 'bg-[#6949FF] text-white'
                  )}
                >
                  {pair.blackSan}
                </button>
              ) : (
                <span className="font-mono text-gray-400">-</span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex-grow flex flex-col items-center justify-center text-center p-4 text-[#757575] dark:text-[#BDBDBD]">
          <svg className="w-8 h-8 opacity-40 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="font-urbanist text-xs sm:text-sm italic">
            No moves played yet. Start a game to see move notation!
          </p>
        </div>
      )}
    </div>
  )
}

export default MoveHistory
