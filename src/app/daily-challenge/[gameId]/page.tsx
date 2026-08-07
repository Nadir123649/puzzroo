'use client'

import { Suspense, useEffect, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { Loader2, Check, Clock, ArrowLeft, Brain, AlertCircle, Target } from 'lucide-react'
import { getTodayChallenge, generateDailyChallenge } from '@shared/lib/dailyChallenge/generator'
import { GameLoader } from '@/components/ui/GameLoader'
import { DailyChallenge } from '@shared/lib/dailyChallenge/types'
import { api } from '@/lib/api/client'
import { SudokuGame } from '@/components/sudoku/SudokuGame'
import { SudokuHero } from '@/components/sudoku/SudokuHero'
import { CrossMathGame } from '@/components/crossmath/CrossMathGame'
import { CrossMathHero } from '@/components/crossmath/CrossMathHero'
import { NonogramGame } from '@/components/nonogram/NonogramGame'
import { NonogramHero } from '@/components/nonogram/NonogramHero'
import { TangramGame } from '@/components/tangram/TangramGame'
import { TangramHero } from '@/components/tangram/TangramHero'
import { AppLayout } from '@/components/layout/AppLayout'

function formatTime(seconds?: number): string {
  if (!seconds && seconds !== 0) return 'N/A'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

function DailyChallengeContent() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const gameId = params.gameId as string
  const dateParam = searchParams.get('date')

  const [challenge, setChallenge] = useState<DailyChallenge | null>(null)
  const [completionCheck, setCompletionCheck] = useState<'loading' | 'completed' | 'not-completed' | 'error'>('loading')
  const [completionStats, setCompletionStats] = useState<any>(null)

  const gameIdForApi = gameId === 'cross-math' ? 'crossmath' : gameId
  const replayParam = searchParams.get('replay')
  const backPath = `/past-puzzles/${gameId}`

  useEffect(() => {
    let cancelled = false

    async function checkCompletion() {
      if (!dateParam) {
        const todayChallenge = getTodayChallenge(gameId as 'sudoku' | 'cross-math' | 'nonogram' | 'tangram')
        if (!cancelled) setChallenge(todayChallenge)
      } else {
        const [month, day, year] = dateParam.split('-')
        const fullYear = 2000 + parseInt(year)
        const date = new Date(fullYear, parseInt(month) - 1, parseInt(day))
        const specificChallenge = generateDailyChallenge(date, gameId as 'sudoku' | 'cross-math' | 'nonogram' | 'tangram')
        if (!cancelled) setChallenge(specificChallenge)
      }

      if (replayParam === 'true') {
        setCompletionCheck('not-completed')
        return
      }


      try {
        const params: Record<string, string> = {}
        if (dateParam) {
          const parts = dateParam.split('-')
          if (parts.length === 3) {
            const [m, d, y] = parts
            const fullYear = y.length === 2 ? `20${y}` : y
            params.date = `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
          } else {
            params.date = dateParam
          }
        }
        const res = await api(`/api/v1/games/${gameIdForApi}/daily/completion`, { params })

        if (cancelled) return

        if (res.success) {
          const payload = res.payload as any
          if (payload?.completed) {
            setCompletionStats(payload)
            setCompletionCheck('completed')
            return
          }
        }
        setCompletionCheck('not-completed')
      } catch {
        if (!cancelled) setCompletionCheck('not-completed')
      }
    }

    checkCompletion()

    return () => { cancelled = true }
  }, [gameId, gameIdForApi, dateParam])

  if (!challenge || completionCheck === 'loading') {
    return <GameLoader isOpen={true} text="Loading puzzle..." />
  }


  return (
    <AppLayout>
      <main className="flex-grow flex flex-col">
        
        {/* Reuse existing Hero components with custom back navigation */}
        {gameId === 'sudoku' ? (
          <>
            <SudokuHero backTo={backPath} />
            <SudokuGame />
          </>
        ) : gameId === 'cross-math' ? (
          <>
            <CrossMathHero backTo={backPath} />
            <CrossMathGame />
          </>
        ) : gameId === 'nonogram' ? (
          <>
            <NonogramHero backTo={backPath} />
            <NonogramGame />
          </>
        ) : gameId === 'tangram' ? (
          <>
            <TangramHero backTo={backPath} />
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
  return (
    <Suspense fallback={<GameLoader isOpen={true} text="Loading puzzle..." />}>
      <DailyChallengeContent />
    </Suspense>
  )
}
