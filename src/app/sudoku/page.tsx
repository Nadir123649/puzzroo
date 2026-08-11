'use client'

import { Suspense, useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { SudokuHero } from '@/components/sudoku/SudokuHero'
import { SudokuGame } from '@/components/sudoku/SudokuGame'
import { useGlobalLoader } from '@/contexts/GlobalLoaderContext'
import { markGameAsPlayed } from '@/components/sections/FreeGames'

function SudokuContent() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    markGameAsPlayed('sudoku')
  }, [])

  if (!mounted) return null

  return (
    <>
      <SudokuHero />
      <SudokuGame />
    </>
  )
}

export default function SudokuPage() {
  const { showLoader, hideLoader } = useGlobalLoader()

  useEffect(() => {
    // Show loader on mount
    showLoader('Loading puzzle...', 200)
    
    // Hide after minimum duration
    const timer = setTimeout(() => {
      hideLoader()
    }, 200)
    
    return () => {
      clearTimeout(timer)
      hideLoader()
    }
  }, [showLoader, hideLoader])

  return (
    <>
      <title>Sudoku | Puzzroo Games</title>
      <AppLayout>
        <main className="flex-grow flex flex-col">
          <Suspense fallback={<div className="flex-grow" />}>
            <SudokuContent />
          </Suspense>
        </main>
      </AppLayout>
    </>
  )
}
