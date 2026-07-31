'use client'

import { Suspense, useEffect, useState } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { SudokuHero } from '@/components/sudoku/SudokuHero'
import { SudokuGame } from '@/components/sudoku/SudokuGame'
import { GameLoader } from '@/components/ui/GameLoader'
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
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 200)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      <GameLoader isOpen={initialLoading} text="Loading puzzle..." />
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
