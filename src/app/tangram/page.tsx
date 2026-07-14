/**
 * Tangram Page
 * Main entry point for Tangram game
 */

'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/layout/navbar'
import { Footer } from '@/components/layout/Footer'
import { TangramHero } from '@/components/tangram/TangramHero'
import { TangramGame } from '@/components/tangram/TangramGame'
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
  return (
    <div className="min-h-screen bg-white dark:bg-[#181A20] transition-colors duration-300 flex flex-col">
      <div className="w-full max-w-[1380px] mx-auto flex-grow flex flex-col pb-0 md:pb-[10px]">
        <Navbar />
        <main className="flex-grow flex flex-col">
          <Suspense fallback={<div className="flex-grow" />}>
            <TangramContent />
          </Suspense>
        </main>
      </div>
      <Footer />
    </div>
  )
}
