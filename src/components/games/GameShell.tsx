'use client'

import { type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { GameLoader } from '@/components/ui/GameLoader'

export interface ShellFeatureButton {
  key: string
  icon: ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  badge?: number
}

interface GameShellProps {
  difficultyLabel?: string
  timeLabel?: string
  timeCaption?: string
  progressPercent?: number
  progressLabel?: string
  featureButtons?: ShellFeatureButton[]
  board: ReactNode
  sidebarExtras?: ReactNode
  mobileExtras?: ReactNode
  onNewGame?: () => void
  onReplay?: () => void
  newGameLabel?: string
  showNewGame?: boolean
  showReplay?: boolean
  isResetting?: boolean
  loaderText?: string
  modal?: ReactNode
}

/**
 * Shared game layout that mirrors the Tangram UI shell exactly:
 * - Desktop: board left, sticky premium controls card right
 * - Mobile: timer/progress, board, feature row, action buttons stacked
 */
export function GameShell({
  difficultyLabel = 'easy',
  timeLabel,
  timeCaption = 'Time Remaining',
  progressPercent = 0,
  progressLabel,
  featureButtons = [],
  board,
  sidebarExtras,
  mobileExtras,
  onNewGame,
  onReplay,
  newGameLabel = 'New Game',
  showNewGame = true,
  showReplay = true,
  isResetting = false,
  loaderText = 'Loading game...',
  modal,
}: GameShellProps) {
  return (
    <section className="w-full bg-white dark:bg-[#181A20] transition-colors duration-300 relative">
      <div className="w-full max-w-[1380px] mx-auto px-[20px] flex justify-center overflow-visible">
        <div className="w-full flex flex-col gap-[20px] pb-0 md:pb-[10px] max-w-full overflow-visible">

          {/* Desktop Layout */}
          <div className="hidden md:flex gap-[50px] justify-center items-start overflow-visible relative md:pt-6">
            {/* LEFT SIDE - BOARD */}
            <div className="flex-1 max-w-[700px] min-w-[320px] overflow-visible">
              {board}
            </div>

            {/* RIGHT SIDE - CONTROLS PANEL */}
            <div className="flex-shrink-0 w-[360px] flex flex-col gap-4 sticky top-[100px]">
              {/* Premium Controls Card */}
              <div className="w-full bg-[#F5F6FA] dark:bg-[#1F222A] border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] rounded-2xl p-5 shadow-lg shadow-purple-500/5 flex flex-col gap-5 flex-1 mb-3">
                {/* Difficulty Heading */}
                <div className="text-center">
                  <span className="font-urbanist text-[11px] text-[#757575] dark:text-[#9E9E9E] uppercase tracking-wider font-bold">
                    Difficulty
                  </span>
                  <h3 className="font-urbanist text-2xl font-extrabold text-[#212121] dark:text-white capitalize select-none mt-0.5">
                    {difficultyLabel}
                  </h3>
                </div>

                {/* Time and Progress Row */}
                <div className="flex flex-col gap-3">
                  {timeLabel !== undefined && (
                    <div className="bg-white dark:bg-[#181A20] rounded-xl p-2 border border-[#E0E0E0] dark:border-[#35383F] text-center">
                      <span className="font-urbanist text-[10px] font-semibold text-[#757575] dark:text-[#9E9E9E] uppercase tracking-wide">
                        {timeCaption}
                      </span>
                      <div className="block mt-0.5 font-urbanist text-lg font-bold text-[#212121] dark:text-white">
                        {timeLabel}
                      </div>
                    </div>
                  )}

                  <div className="bg-white dark:bg-[#181A20] rounded-xl p-3 border border-[#E0E0E0] dark:border-[#35383F]">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-urbanist text-[10px] font-semibold text-[#757575] dark:text-[#9E9E9E] uppercase tracking-wide">
                        Progress
                      </span>
                      {progressLabel && (
                        <span className="font-urbanist text-[10px] font-bold text-[var(--color-primary)]">
                          {progressLabel}
                        </span>
                      )}
                    </div>
                    <div className="w-full h-2.5 bg-[#F0EDFF] dark:bg-[#35383F] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-[#6949FF] to-[#8B6EFF] rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
                      />
                    </div>
                    <div className="text-right mt-1">
                      <span className="font-urbanist text-[10px] font-bold text-[var(--color-primary)]">
                        {Math.round(progressPercent)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Feature Row */}
                {featureButtons.length > 0 && (
                  <div className="flex justify-between items-center gap-[8px] pt-1">
                    {featureButtons.map((btn) => (
                      <button
                        key={btn.key}
                        onClick={btn.onClick}
                        disabled={btn.disabled}
                        className="relative w-[50.31px] h-[50.31px] rounded-full bg-[#F0EDFF] dark:bg-[#F0EDFF] flex items-center justify-center hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        title={btn.label}
                        aria-label={btn.label}
                      >
                        {btn.icon}
                        {btn.badge !== undefined && btn.badge > 0 && (
                          <span className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-[#A592FF] rounded-full border-2 border-white dark:border-[#181A20] flex items-center justify-center z-10">
                            <span className="font-urbanist font-bold text-white text-[9px]">
                              {btn.badge}
                            </span>
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Per-game extras (number pad / stats) */}
                {sidebarExtras}
              </div>

              {/* Bottom Actions Section */}
              <div className="w-full flex flex-col gap-[12px]">
                {showNewGame && (
                  <button
                    onClick={onNewGame}
                    disabled={isResetting}
                    className="w-full h-[46px] rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-urbanist font-bold text-[16px] transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isResetting ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        <span>Loading...</span>
                      </>
                    ) : (
                      newGameLabel
                    )}
                  </button>
                )}

                {showReplay && onReplay && (
                  <button
                    onClick={onReplay}
                    disabled={isResetting}
                    className="w-full h-[46px] rounded-full border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[#F0EDFF] dark:hover:bg-[#35383F] font-urbanist font-bold text-[16px] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    Replay
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden flex flex-col gap-[16px] items-center pb-[50px]">
            <div className="w-full flex flex-col gap-2">
              {timeLabel !== undefined && (
                <div className="bg-[#F0EDFF] dark:bg-[#1F222A] rounded-xl p-3 flex flex-col items-center gap-1">
                  <span className="font-urbanist text-xs font-medium text-[#757575] dark:text-[#9E9E9E]">
                    {timeCaption}
                  </span>
                  <span className="font-urbanist text-xl font-bold text-[#212121] dark:text-white">
                    {timeLabel}
                  </span>
                </div>
              )}

              <div className="bg-[#F0EDFF] dark:bg-[#1F222A] rounded-xl p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-urbanist text-xs font-medium text-[#757575] dark:text-[#9E9E9E]">
                    Progress
                  </span>
                  {progressLabel && (
                    <span className="font-urbanist text-xs font-bold text-[var(--color-primary)]">
                      {progressLabel}
                    </span>
                  )}
                </div>
                <div className="w-full h-2.5 bg-white dark:bg-[#35383F] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#6949FF] to-[#8B6EFF] rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
                  />
                </div>
              </div>
            </div>

            {board}

            {featureButtons.length > 0 && (
              <div className="w-full flex justify-between items-center px-4">
                {featureButtons.map((btn) => (
                  <button
                    key={btn.key}
                    onClick={btn.onClick}
                    disabled={btn.disabled}
                    className="relative w-10 h-10 rounded-full bg-[#F0EDFF] dark:bg-[#F0EDFF] flex items-center justify-center hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    title={btn.label}
                    aria-label={btn.label}
                  >
                    {btn.icon}
                    {btn.badge !== undefined && btn.badge > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#A592FF] rounded-full border border-white dark:border-[#181A20] flex items-center justify-center z-10">
                        <span className="font-urbanist font-bold text-white text-[8px]">
                          {btn.badge}
                        </span>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {mobileExtras}

            {showNewGame && (
              <button
                onClick={onNewGame}
                disabled={isResetting}
                className="w-full h-[46px] rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-urbanist font-bold text-[16px] transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isResetting ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Loading...</span>
                  </>
                ) : (
                  newGameLabel
                )}
              </button>
            )}

            {showReplay && onReplay && (
              <button
                onClick={onReplay}
                disabled={isResetting}
                className="w-full h-[46px] rounded-full border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[#F0EDFF] dark:hover:bg-[#35383F] font-urbanist font-bold text-[16px] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                Replay
              </button>
            )}
          </div>
        </div>
      </div>

      <GameLoader isOpen={isResetting} text={loaderText} />
      {modal}
    </section>
  )
}
