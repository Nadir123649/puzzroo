'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { NonogramHero } from '@/components/nonogram/NonogramHero'
import { NonogramGame } from '@/components/nonogram/NonogramGame'
import { GameLoader } from '@/components/ui/GameLoader'
import { markGameAsPlayed } from '@/components/sections/FreeGames'

function NonogramContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    markGameAsPlayed('nonogram')
  }, [])

  const puzzleId = searchParams.get('puzzleId')
  const diffParam = searchParams.get('difficulty')
  const dateParam = searchParams.get('date')
  const skipSelection = searchParams.get('skipSelection')
  const shouldRenderGame = puzzleId || diffParam || dateParam || skipSelection

  return (
    <>
      <NonogramHero />
      {shouldRenderGame && <NonogramGame puzzleId={puzzleId || undefined} />}
    </>
  )
}

export default function NonogramPage() {
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
            <NonogramContent />
          </Suspense>
        </main>
      </AppLayout>
    </>
  )
}
