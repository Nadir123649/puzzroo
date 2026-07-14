'use client'

import { RotateCcw, Undo, Eraser, Pencil, Lightbulb } from 'lucide-react'

interface SudokuControlsProps {
  notesMode: boolean
  availableHints: number
  onUndo: () => void
  onErase: () => void
  onTogglePencil: () => void
  onHint: () => void
  mobile?: boolean
  showPencil?: boolean
  canUndo?: boolean
  showReplay?: boolean
  onReplay?: () => void
}

export function SudokuControls({
  notesMode,
  availableHints,
  onUndo,
  onErase,
  onTogglePencil,
  onHint,
  mobile = false,
  showPencil = true,
  canUndo = true,
  showReplay = false,
  onReplay,
}: SudokuControlsProps) {
  if (mobile) {
    return (
      <div className="w-full flex justify-between items-center px-4">
        {/* Undo Button */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="w-10 h-10 rounded-full bg-[#F0EDFF] dark:bg-[#F0EDFF] flex items-center justify-center hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Undo"
        >
          <Undo size={20} strokeWidth={2} className="text-[#424242]" />
        </button>

        {/* Erase Button */}
        <button
          onClick={onErase}
          className="w-10 h-10 rounded-full bg-[#F0EDFF] dark:bg-[#F0EDFF] flex items-center justify-center hover:opacity-80 transition-opacity"
          aria-label="Erase"
        >
          <Eraser size={20} strokeWidth={2} className="text-[#424242]" />
        </button>

        {/* Replay Button */}
        {showReplay && onReplay && (
          <button
            onClick={onReplay}
            className="w-10 h-10 rounded-full bg-[#F0EDFF] dark:bg-[#F0EDFF] flex items-center justify-center hover:opacity-80 transition-opacity"
            aria-label="Replay"
          >
            <RotateCcw size={20} strokeWidth={2} className="text-[#424242]" />
          </button>
        )}

        {/* Pencil/Notes Button - conditionally rendered */}
        {showPencil && (
          <button
            onClick={onTogglePencil}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              notesMode
                ? 'bg-[#A592FF] ring-2 ring-[var(--color-primary)]'
                : 'bg-[#F0EDFF] dark:bg-[#F0EDFF] hover:opacity-80'
            }`}
            aria-label="Pencil mode"
            aria-pressed={notesMode}
          >
            <Pencil size={20} strokeWidth={2} className={notesMode ? 'text-white' : 'text-[#424242]'} />
          </button>
        )}

        {/* Hint Button */}
        <button
          onClick={onHint}
          disabled={availableHints <= 0}
          className="relative w-10 h-10 rounded-full bg-[#F0EDFF] dark:bg-[#F0EDFF] flex items-center justify-center hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Hint"
        >
          <Lightbulb size={20} strokeWidth={2} className="text-[#424242]" />
          {/* Hint Badge */}
          {availableHints > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#A592FF] rounded-full border border-white dark:border-[#181A20] flex items-center justify-center z-10">
              <span className="font-urbanist font-bold text-white text-[8px]">
                {availableHints}
              </span>
            </span>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="w-full flex justify-between items-center gap-[8px]">
      {/* Undo Button */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="w-[50.31px] h-[50.31px] rounded-full bg-[#F0EDFF] dark:bg-[#F0EDFF] flex items-center justify-center hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Undo"
      >
        <Undo size={27} strokeWidth={2} className="text-[#424242]" />
      </button>

      {/* Erase Button */}
      <button
        onClick={onErase}
        className="w-[50.31px] h-[50.31px] rounded-full bg-[#F0EDFF] dark:bg-[#F0EDFF] flex items-center justify-center hover:opacity-80 transition-opacity"
        aria-label="Erase"
      >
        <Eraser size={27} strokeWidth={2} className="text-[#424242]" />
      </button>

      {/* Replay Button */}
      {showReplay && onReplay && (
        <button
          onClick={onReplay}
          className="w-[50.31px] h-[50.31px] rounded-full bg-[#F0EDFF] dark:bg-[#F0EDFF] flex items-center justify-center hover:opacity-80 transition-opacity"
          aria-label="Replay"
        >
          <RotateCcw size={27} strokeWidth={2} className="text-[#424242]" />
        </button>
      )}

      {/* Pencil/Notes Button - conditionally rendered */}
      {showPencil && (
        <button
          onClick={onTogglePencil}
          className={`w-[50.31px] h-[50.31px] rounded-full flex items-center justify-center transition-all ${
            notesMode
              ? 'bg-[#A592FF] ring-2 ring-[var(--color-primary)]'
              : 'bg-[#F0EDFF] dark:bg-[#F0EDFF] hover:opacity-80'
          }`}
          aria-label="Pencil mode"
          aria-pressed={notesMode}
        >
          <Pencil size={27} strokeWidth={2} className={notesMode ? 'text-white' : 'text-[#424242]'} />
        </button>
      )}

      {/* Hint Button */}
      <button
        onClick={onHint}
        disabled={availableHints <= 0}
        className="relative w-[50.31px] h-[50.31px] rounded-full bg-[#F0EDFF] dark:bg-[#F0EDFF] flex items-center justify-center hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Hint"
      >
        <Lightbulb size={27} strokeWidth={2} className="text-[#424242]" />
        {/* Hint Badge */}
        {availableHints > 0 && (
          <span className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-[#A592FF] rounded-full border-2 border-white dark:border-[#181A20] flex items-center justify-center z-10">
            <span className="font-urbanist font-bold text-white text-[9px]">
              {availableHints}
            </span>
          </span>
        )}
      </button>
    </div>
  )
}
