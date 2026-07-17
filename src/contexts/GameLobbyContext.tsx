'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import type { Difficulty } from '@shared/data/sudoku/types'

interface GameLobbyContextType {
  selectedDifficulty: Difficulty
  setSelectedDifficulty: (difficulty: Difficulty) => void
}

const GameLobbyContext = createContext<GameLobbyContextType | undefined>(undefined)

export function GameLobbyProvider({ children }: { children: ReactNode }) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty>('easy')

  return (
    <GameLobbyContext.Provider value={{ selectedDifficulty, setSelectedDifficulty }}>
      {children}
    </GameLobbyContext.Provider>
  )
}

export function useGameLobby() {
  const context = useContext(GameLobbyContext)
  if (context === undefined) {
    throw new Error('useGameLobby must be used within a GameLobbyProvider')
  }
  return context
}
