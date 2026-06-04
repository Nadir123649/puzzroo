/**
 * Sudoku Controls Component
 * Feature buttons (Undo, Erase, Pencil, Hint)
 */

'use client'

import React from 'react'
import { RotateCcw, Eraser, Pencil, Lightbulb } from 'lucide-react'

interface SudokuControlsProps {
  notesMode: boolean
  availableHints: number
  onUndo: () => void
  onErase: () => void
  onTogglePencil: () => void
  onHint: () => void
  mobile?: boolean
}

export function SudokuControls({
  notesMode,
  availableHints,
  onUndo,
  onErase,
  onTogglePencil,
  onHint,
  mobile = false,
}: SudokuControlsProps) {
  if (mobile) {
    return (
      <div className="w-full max-w-[350px] flex justify-between items-center px-2">
        {/* Undo/Replay Button */}
        <button
          onClick={onUndo}
          className="w-[63.44px] h-[63.44px] rounded-full bg-[#F0EDFF] dark:bg-[#F0EDFF] flex items-center justify-center hover:opacity-80 transition-opacity"
          aria-label="Undo"
        >
          <RotateCcw size={34} strokeWidth={2} className="text-[#424242]" />
        </button>

        {/* Erase Button */}
        <button
          onClick={onErase}
          className="w-[63.44px] h-[63.44px] rounded-full bg-[#F0EDFF] dark:bg-[#F0EDFF] flex items-center justify-center hover:opacity-80 transition-opacity"
          aria-label="Erase"
        >
          <Eraser size={34} strokeWidth={2} className="text-[#424242]" />
        </button>

        {/* Pencil/Notes Button */}
        <button
          onClick={onTogglePencil}
          className={`w-[63.44px] h-[63.44px] rounded-full flex items-center justify-center transition-all ${
            notesMode
              ? 'bg-[#A592FF] ring-2 ring-[var(--color-primary)]'
              : 'bg-[#F0EDFF] dark:bg-[#F0EDFF] hover:opacity-80'
          }`}
          aria-label="Pencil mode"
          aria-pressed={notesMode}
        >
          <Pencil size={34} strokeWidth={2} className={notesMode ? 'text-white' : 'text-[#424242]'} />
        </button>

        {/* Hint Button */}
        <button
          onClick={onHint}
          disabled={availableHints <=0}
          className="relative w-[63.44px] h-[63.44px] rounded-full bg-[#F0EDFF] dark:bg-[#F0EDFF] flex items-center justify-center hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Hint"
        >
          <Lightbulb size={34} strokeWidth={2} className="text-[#424242]" />
          {/* Hint Badge */}
          {availableHints > 0 && (
            <span className="absolute top-0 right-0 w-[20px] h-[20px] bg-[var(--color-primary)] rounded-full border-2 border-white dark:border-[#181A20] flex items-center justify-center">
              <span className="font-urbanist font-bold text-white text-[10px]">
                {availableHints}
              </span>
            </span>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="w-[230px] h-[50.31px] flex justify-between items-center gap-[8px]">
      {/* Undo/Replay Button */}
      <button
        onClick={onUndo}
        className="w-[50.31px] h-[50.31px] rounded-full bg-[#F0EDFF] dark:bg-[#F0EDFF] flex items-center justify-center hover:opacity-80 transition-opacity"
        aria-label="Undo"
      >
        <RotateCcw size={27} strokeWidth={2} className="text-[#424242]" />
      </button>

      {/* Erase Button */}
      <button
        onClick={onErase}
        className="w-[50.31px] h-[50.31px] rounded-full bg-[#F0EDFF] dark:bg-[#F0EDFF] flex items-center justify-center hover:opacity-80 transition-opacity"
        aria-label="Erase"
      >
        <Eraser size={27} strokeWidth={2} className="text-[#424242]" />
      </button>

      {/* Pencil/Notes Button */}
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
          <span className="absolute top-0 right-0 w-[18px] h-[18px] bg-[var(--color-primary)] rounded-full border-2 border-white dark:border-[#181A20] flex items-center justify-center">
            <span className="font-urbanist font-bold text-white text-[9px]">
              {availableHints}
            </span>
          </span>
        )}
      </button>
    </div>
  )
}
