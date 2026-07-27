'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/layout/navbar'
import { Footer } from '@/components/layout/Footer'
import { CrossMathHero } from '@/components/crossmath/CrossMathHero'
import { CrossMathGame } from '@/components/crossmath/CrossMathGame'
import { GameLoader } from '@/components/ui/GameLoader'
import { markGameAsPlayed } from '@/components/sections/FreeGames'

function CrossMathContent() {
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    setMounted(true)
    
    // Mark CrossMath as played
    markGameAsPlayed('cross-math')
    
    // Get difficulty from URL or use default
    const difficulty = searchParams.get('difficulty') || 'easy'
    
    // Validate difficulty
    if (!['easy', 'medium', 'hard'].includes(difficulty)) {
      router.replace('/cross-math?difficulty=easy')
    }
  }, [searchParams, router])

  if (!mounted) {
    return null
  }

  return (
    <>
      <CrossMathHero />
      <CrossMathGame />
    </>
  )
}

export default function CrossMathPage() {
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 200)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      <GameLoader isOpen={initialLoading} text="Loading game..." />
      <div className="min-h-screen bg-white dark:bg-[#181A20] transition-colors duration-300 flex flex-col">
        <div className="w-full max-w-[1380px] mx-auto flex-grow flex flex-col pb-0 md:pb-[50px]">
          <Navbar />
          <main className="flex-grow flex flex-col">
            <Suspense fallback={<div className="flex-grow" />}>
              <CrossMathContent />
            </Suspense>
          </main>
        </div>
        <Footer />
      </div>
    </>
  )
}
