'use client'

import { createContext, useContext, ReactNode } from 'react'
import { Difficulty } from '@shared/lib/crossmath/types'

interface CrossMathContextType {
  difficulty: Difficulty
  changeDifficulty: (newDifficulty: Difficulty) => void
}

const CrossMathContext = createContext<CrossMathContextType | undefined>(undefined)

export function useCrossMathContext() {
  const context = useContext(CrossMathContext)
  if (!context) {
    throw new Error('useCrossMathContext must be used within CrossMathProvider')
  }
  return context
}

interface CrossMathProviderProps {
  children: ReactNode
  value: CrossMathContextType
}

export function CrossMathProvider({ children, value }: CrossMathProviderProps) {
  return (
    <CrossMathContext.Provider value={value}>
      {children}
    </CrossMathContext.Provider>
  )
}
