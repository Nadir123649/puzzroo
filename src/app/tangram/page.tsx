/**
 * Tangram Page
 * Main entry point for Tangram game
 */

'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/AppLayout'
import { TangramHero } from '@/components/tangram/TangramHero'
import { TangramGame } from '@/components/tangram/TangramGame'
import { GameLoader } from '@/components/ui/GameLoader'
import { markGameAsPlayed } from '@/components/sections/FreeGames'

function TangramContent() {
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    setMounted(true)
    
    // Mark Tangram as played
    markGameAsPlayed('tangram')
    
    // Get difficulty from URL or use default
    const difficulty = searchParams?.get('difficulty') || 'easy'
    
    // Validate difficulty
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      router.replace('/tangram?difficulty=easy')
    }
  }, [searchParams, router])

  if (!mounted) {
    return null
  }

  return (
    <>
      <TangramHero />
      <TangramGame />
    </>
  )
}

export default function TangramPage() {
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 200)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      <GameLoader isOpen={initialLoading} text="Loading game..." />
      <AppLayout>
        <main className="flex-grow flex flex-col">
          <Suspense fallback={<div className="flex-grow" />}>
            <TangramContent />
          </Suspense>
        </main>
      </AppLayout>
    </>
  )
}
