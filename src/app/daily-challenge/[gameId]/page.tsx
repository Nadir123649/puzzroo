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
import Navbar from '@/components/layout/navbar'
import Footer from '@/components/layout/Footer'

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

      try {
        const params: Record<string, string> = {}
        if (dateParam) params.date = `${new Date().getFullYear()}-${dateParam}`
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#181A20]">
        <Loader2 className="animate-spin text-[#6949FF]" size={48} />
      </div>
    )
  }

  if (completionCheck === 'completed') {
    return (
      <div className="min-h-screen bg-white dark:bg-[#181A20] transition-colors duration-300 flex flex-col">
        <div className="w-full max-w-[1380px] mx-auto flex-grow flex flex-col pb-0 md:pb-[50px]">
          <Navbar />
          <main className="flex-grow flex items-center justify-center px-4">
            <div className="w-full max-w-md bg-white dark:bg-[#1F222A] rounded-2xl border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] p-6 md:p-8 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-green-600" strokeWidth={3} />
              </div>

              <h1 className="font-urbanist font-bold text-[22px] text-[#212121] dark:text-white mb-2">
                Challenge Completed
              </h1>
              <p className="font-urbanist text-[14px] text-[#757575] dark:text-[#BDBDBD] mb-6">
                {dateParam || "Today's Daily Challenge"}
              </p>

              {(completionStats?.elapsedSeconds !== undefined || completionStats?.score) && (
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {completionStats.elapsedSeconds !== undefined && (
                    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                      <Clock size={16} className="text-[#6949FF] mx-auto mb-1" />
                      <p className="font-urbanist text-[11px] text-[#757575] dark:text-[#BDBDBD]">Time</p>
                      <p className="font-urbanist font-bold text-[14px] text-[#212121] dark:text-white">
                        {formatTime(completionStats.elapsedSeconds)}
                      </p>
                    </div>
                  )}
                  {completionStats.accuracy !== undefined && (
                    <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-xl">
                      <Target size={16} className="text-green-600 mx-auto mb-1" />
                      <p className="font-urbanist text-[11px] text-[#757575] dark:text-[#BDBDBD]">Accuracy</p>
                      <p className="font-urbanist font-bold text-[14px] text-[#212121] dark:text-white">
                        {Math.round(completionStats.accuracy)}%
                      </p>
                    </div>
                  )}
                  {completionStats.score !== undefined && completionStats.score > 0 && (
                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                      <Brain size={16} className="text-orange-600 mx-auto mb-1" />
                      <p className="font-urbanist text-[11px] text-[#757575] dark:text-[#BDBDBD]">Score</p>
                      <p className="font-urbanist font-bold text-[14px] text-[#212121] dark:text-white">
                        {completionStats.score}
                      </p>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => router.push(backPath)}
                className="w-full h-[48px] rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white font-urbanist font-bold text-[15px] transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <ArrowLeft size={18} />
                Back to Past Puzzles
              </button>
            </div>
          </main>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#181A20] transition-colors duration-300 flex flex-col">
      <div className="w-full max-w-[1380px] mx-auto flex-grow flex flex-col pb-0 md:pb-[50px]">
        <Navbar />
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
      </div>
      <Footer />
    </div>
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
          <Loader2 className="animate-spin text-[#6949FF]" size={48} />
        </div>
      }>
        <DailyChallengeContent />
      </Suspense>
    </>
  )
}
