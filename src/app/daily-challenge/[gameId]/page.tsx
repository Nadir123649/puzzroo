'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { getTodayChallenge, generateDailyChallenge } from '@shared/lib/dailyChallenge/generator'
import { GameLoader } from '@/components/ui/GameLoader'
import { DailyChallenge } from '@shared/lib/dailyChallenge/types'
import { SudokuGame } from '@/components/sudoku/SudokuGame'
import { SudokuHero } from '@/components/sudoku/SudokuHero'
import { CrossMathGame } from '@/components/crossmath/CrossMathGame'
import { CrossMathHero } from '@/components/crossmath/CrossMathHero'
import { NonogramGame } from '@/components/nonogram/NonogramGame'
import { NonogramHero } from '@/components/nonogram/NonogramHero'
import { TangramGame } from '@/components/tangram/TangramGame'
import { TangramHero } from '@/components/tangram/TangramHero'
import { AppLayout } from '@/components/layout/AppLayout'

function DailyChallengeContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const gameId = params.gameId as string
  const dateParam = searchParams.get('date')

  const [challenge, setChallenge] = useState<DailyChallenge | null>(null)

  useEffect(() => {
    if (dateParam) {
      // Parse date from MM-DD-YY format
      const [month, day, year] = dateParam.split('-')
      const fullYear = 2000 + parseInt(year)
      const date = new Date(fullYear, parseInt(month) - 1, parseInt(day))
      const specificChallenge = generateDailyChallenge(date, gameId as 'sudoku' | 'cross-math' | 'nonogram' | 'tangram')
      setChallenge(specificChallenge)
    } else {
      // Get today's challenge
      const todayChallenge = getTodayChallenge(gameId as 'sudoku' | 'cross-math' | 'nonogram' | 'tangram')
      setChallenge(todayChallenge)
    }
  }, [gameId, dateParam])

  if (!challenge) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#181A20]">
        <Loader2 className="animate-spin text-[var(--color-primary)]" size={48} />
      </div>
    )
  }

  return (
    <AppLayout>
      <main className="flex-grow flex flex-col">
        
        {/* Reuse existing Hero components with custom back navigation */}
        {gameId === 'sudoku' ? (
          <>
            <SudokuHero backTo="/past-puzzles/sudoku" />
            <SudokuGame />
          </>
        ) : gameId === 'cross-math' ? (
          <>
            <CrossMathHero backTo="/past-puzzles/cross-math" />
            <CrossMathGame />
          </>
        ) : gameId === 'nonogram' ? (
          <>
            <NonogramHero backTo="/past-puzzles/nonogram" />
            <NonogramGame />
          </>
        ) : gameId === 'tangram' ? (
          <>
            <TangramHero backTo="/past-puzzles/tangram" />
            <TangramGame />
          </>
        ) : (
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-2xl">Game not found</p>
          </div>
        )}
        
      </main>
    </AppLayout>
  )
}

export default function DailyChallengePage() {
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 200)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      <GameLoader isOpen={initialLoading} text="Loading puzzle..." />
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#181A20]">
          <Loader2 className="animate-spin text-[var(--color-primary)]" size={48} />
        </div>
      }>
        <DailyChallengeContent />
      </Suspense>
    </>
  )
}


