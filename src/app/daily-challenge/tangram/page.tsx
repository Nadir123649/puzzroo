/**
 * Tangram Daily Challenge Page
 * Daily challenge for Tangram game
 */

'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { TangramGame } from '@/components/tangram/TangramGame'
import { TangramHero } from '@/components/tangram/TangramHero'
import { markGameAsPlayed } from '@/components/sections/FreeGames'

function TangramDailyChallengeContent() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Mark as played
    markGameAsPlayed('tangram')
  }, [])

  if (!mounted) {
    return null
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
