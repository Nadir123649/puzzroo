'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Clock, ArrowLeft, Target } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { TangramGame } from '@/components/tangram/TangramGame'
import { TangramHero } from '@/components/tangram/TangramHero'
import { markGameAsPlayed } from '@/components/sections/FreeGames'
import { api } from '@/lib/api/client'

function formatTime(seconds?: number): string {
  if (!seconds && seconds !== 0) return 'N/A'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${s}s`
}

function TangramDailyChallengeContent() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [completionCheck, setCompletionCheck] = useState<'loading' | 'completed' | 'not-completed'>('loading')
  const [completionStats, setCompletionStats] = useState<any>(null)

  useEffect(() => {
    setMounted(true)
    markGameAsPlayed('tangram')

    api('/api/v1/games/tangram/daily/completion').then(res => {
      if (res.success) {
        const payload = res.payload as any
        if (payload?.completed) {
          setCompletionStats(payload)
          setCompletionCheck('completed')
          return
        }
      }
      setCompletionCheck('not-completed')
    }).catch(() => {
      setCompletionCheck('not-completed')
    })
  }, [])

  if (!mounted || completionCheck === 'loading') {
    return null
  }

  if (completionCheck === 'completed') {
    return (
      <div className="flex-grow flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white dark:bg-[#1F222A] rounded-2xl border-[1.5px] border-[#E0E0E0] dark:border-[#35383F] p-6 md:p-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={32} className="text-green-600" strokeWidth={3} />
          </div>

          <h1 className="font-urbanist font-bold text-[22px] text-[#212121] dark:text-white mb-2">
            Challenge Completed
          </h1>
          <p className="font-urbanist text-[14px] text-[#757575] dark:text-[#BDBDBD] mb-6">
            Today's Tangram Daily Challenge
          </p>

          {(completionStats?.elapsedSeconds !== undefined || completionStats?.accuracy) && (
            <div className="grid grid-cols-2 gap-3 mb-6">
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
            </div>
          )}

          <button
            onClick={() => router.push('/past-puzzles/tangram')}
            className="w-full h-[48px] rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white font-urbanist font-bold text-[15px] transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} />
            Back to Past Puzzles
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <TangramHero backTo="/past-puzzles/tangram" />
      <TangramGame mode="daily" />
    </>
  )
}

export default function TangramDailyChallengePage() {
  return (
    <AppLayout>
      <main className="flex-grow flex flex-col">
        <Suspense fallback={<div className="flex-grow" />}>
          <TangramDailyChallengeContent />
        </Suspense>
      </main>
    </AppLayout>
  )
}
