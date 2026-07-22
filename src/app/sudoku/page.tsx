'use client'

import { Suspense, useEffect, useState } from 'react'
import Navbar from '@/components/layout/navbar'
import { Footer } from '@/components/layout/Footer'
import { SudokuHero } from '@/components/sudoku/SudokuHero'
import { SudokuGame } from '@/components/sudoku/SudokuGame'
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
  return (
    <div className="min-h-screen bg-white dark:bg-[#181A20] transition-colors duration-300 flex flex-col">
      <div className="w-full max-w-[1380px] mx-auto flex-grow flex flex-col pb-0 md:pb-[50px]">
        <Navbar />
        <main className="flex-grow flex flex-col">
          <Suspense fallback={<div className="flex-grow" />}>
            <SudokuContent />
          </Suspense>
        </main>
      </div>
      <Footer />
    </div>
  )
}
