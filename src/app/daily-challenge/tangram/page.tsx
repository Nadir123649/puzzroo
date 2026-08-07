'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  const searchParams = useSearchParams()
  const dateParam = searchParams?.get('date')
  const [mounted, setMounted] = useState(false)
  const [completionCheck, setCompletionCheck] = useState<'loading' | 'completed' | 'not-completed'>('loading')
  const [completionStats, setCompletionStats] = useState<any>(null)

  const backPath = '/past-puzzles/tangram'

  useEffect(() => {
    setMounted(true)
    markGameAsPlayed('tangram')

    let isoDate: string | undefined = undefined
    if (dateParam) {
      const parts = dateParam.split('-')
      if (parts.length === 3) {
        const [m, d, y] = parts
        const fullYear = y.length === 2 ? `20${y}` : y
        isoDate = `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
      } else {
        isoDate = dateParam
      }
    }

    const params = isoDate ? { date: isoDate } : undefined

    api('/api/v1/games/tangram/daily/completion', { params }).then(res => {
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
  }, [dateParam])

  if (!mounted || completionCheck === 'loading') {
    return null
  }


  return (
    <>
      <TangramHero backTo={backPath} />
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
