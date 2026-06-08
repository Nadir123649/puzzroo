'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/layout/navbar'
import { Footer } from '@/components/layout/Footer'
import { SudokuHero } from '@/components/sudoku/SudokuHero'
import { SudokuGame } from '@/components/sudoku/SudokuGame'
import { markGameAsPlayed } from '@/components/sections/FreeGames'

export default function SudokuPage() {
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    setMounted(true)
    
    // Mark Sudoku as played
    markGameAsPlayed('sudoku')
    
    // Get difficulty from URL or use default
    const difficulty = searchParams.get('difficulty') || 'easy'
    
    // Validate difficulty
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      router.replace('/sudoku?difficulty=easy')
    }
  }, [searchParams, router])

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#181A20] transition-colors duration-300 flex flex-col">
      <div className="w-full max-w-[1380px] mx-auto flex-grow flex flex-col pb-0 md:pb-[50px]">
        <Navbar />
        <main className="flex-grow flex flex-col">
          <SudokuHero />
          <SudokuGame />
        </main>
      </div>
      <Footer />
    </div>
  )
}
