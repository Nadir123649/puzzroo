'use client'

import React, { useRef, useEffect } from 'react'
import { MoveRecord } from '@/hooks/useChess'
import { cn } from '@/lib/utils'

interface MoveHistoryProps {
  moves?: MoveRecord[]
  reviewIndex?: number | null
  onReviewMove?: (index: number | null) => void
  mode?: string
  className?: string
}

export function MoveHistory({
  moves = [],
  reviewIndex = null,
  onReviewMove,
  mode = 'pve',
  className,
}: MoveHistoryProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new moves are added
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [moves.length])

  // Count turn pairs (White + Black = 1 move pair)
  const totalMovePairs = Math.ceil(moves.length / 2)

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
            Moves
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
            {totalMovePairs} {totalMovePairs === 1 ? 'move' : 'moves'}
          </span>
        </div>
      </div>

      {/* Move History Table */}
      {moves.length > 0 ? (
        <div
          ref={containerRef}
          className="flex-grow overflow-y-auto pr-0.5 custom-scrollbar relative border border-[#E0D9FF] dark:border-[#35383F] rounded-lg [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <table className="w-full text-left border-collapse table-fixed">
            <thead className="sticky top-0 z-20">
              <tr className="bg-[#6949FF] text-white">
                <th className="py-2 px-1 text-xs font-urbanist font-bold tracking-wider w-[10%] text-center truncate whitespace-nowrap">#</th>
                <th className="py-2 px-1 text-xs font-urbanist font-bold tracking-wider w-[20%] truncate whitespace-nowrap">Move</th>
                <th className="py-2 px-1 text-xs font-urbanist font-bold tracking-wider w-[22%] truncate whitespace-nowrap">Piece</th>
                <th className="py-2 px-1 text-xs font-urbanist font-bold tracking-wider w-[18%] truncate whitespace-nowrap">Color</th>
                <th className="py-2 px-1 text-xs font-urbanist font-bold tracking-wider w-[16%] truncate whitespace-nowrap">Team</th>
                <th className="py-2 px-1 text-xs font-urbanist font-bold tracking-wider w-[14%] text-right pr-2 truncate whitespace-nowrap">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 dark:divide-gray-800 bg-white/40 dark:bg-black/10">
              {moves.map((move, idx) => {
                const turnNumber = Math.floor(idx / 2) + 1
                const isSelected = reviewIndex === idx
                
                // Determine team name
                let teamName = ''
                if (mode === 'pve') {
                  teamName = move.color === 'white' ? 'You' : 'AI'
                } else {
                  teamName = move.color === 'white' ? 'P1' : 'P2'
                }

                // Format piece name (Pawn, Knight, etc.)
                const pieceName = move.piece.charAt(0).toUpperCase() + move.piece.slice(1)

                return (
                  <tr
                    key={idx}
                    onClick={() => onReviewMove?.(idx)}
                    className={cn(
                      'hover:bg-[#6949FF]/10 dark:hover:bg-[#6949FF]/20 cursor-pointer transition-colors text-xs font-urbanist font-semibold',
                      isSelected ? 'bg-[#6949FF]/20 dark:bg-[#6949FF]/30 text-[#6949FF] dark:text-purple-300 font-bold' : 'text-[#212121] dark:text-[#FAFAFA]'
                    )}
                  >
                    <td className="py-2 px-1 text-center text-[#757575] dark:text-[#BDBDBD] truncate whitespace-nowrap">{turnNumber}</td>
                    <td className="py-2 px-1 font-mono font-bold truncate whitespace-nowrap">{move.san}</td>
                    <td className="py-2 px-1 truncate whitespace-nowrap">{pieceName}</td>
                    <td className="py-2 px-1 capitalize truncate whitespace-nowrap">{move.color}</td>
                    <td className="py-2 px-1 truncate whitespace-nowrap">{teamName}</td>
                    <td className="py-2 px-1 text-right pr-2 font-mono text-[#757575] dark:text-[#BDBDBD] truncate whitespace-nowrap">{move.timeSpent}s</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
