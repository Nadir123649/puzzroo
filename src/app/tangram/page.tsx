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
import { useGlobalLoader } from '@/contexts/GlobalLoaderContext'
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
  const { showLoader, hideLoader } = useGlobalLoader()

  useEffect(() => {
    // Show loader on mount
    showLoader('Loading puzzle...', 200)
    
    // Hide after minimum duration
    const timer = setTimeout(() => {
      hideLoader()
    }, 200)
    
    return () => {
      clearTimeout(timer)
      hideLoader()
    }
  }, [showLoader, hideLoader])

  return (
    <>
      <title>Tangram | Puzzroo Games</title>
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
