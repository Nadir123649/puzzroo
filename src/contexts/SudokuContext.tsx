/**
 * Sudoku Context
 * Shares difficulty state between game lobby and sudoku game
 */

'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { Difficulty } from '@/data/sudoku/types'
import { loadDifficultyPreference, saveDifficultyPreference } from '@/lib/sudoku/storage'

interface SudokuContextType {
  difficulty: Difficulty
  setDifficulty: (difficulty: Difficulty) => void
}

const SudokuContext = createContext<SudokuContextType | undefined>(undefined)

export function SudokuProvider({ children }: { children: React.ReactNode }) {
  const [difficulty, setDifficultyState] = useState<Difficulty>(() => loadDifficultyPreference())

  const setDifficulty = useCallback((newDifficulty: Difficulty) => {
    setDifficultyState(newDifficulty)
    saveDifficultyPreference(newDifficulty)
  }, [])

  return (
    <SudokuContext.Provider value={{ difficulty, setDifficulty }}>
      {children}
    </SudokuContext.Provider>
  )
}

export function useSudokuContext() {
  const context = useContext(SudokuContext)
  if (!context) {
    throw new Error('useSudokuContext must be used within SudokuProvider')
  }
  return context
}
