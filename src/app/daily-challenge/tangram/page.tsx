/**
 * Tangram Daily Challenge Page
 * Daily challenge for Tangram game
 */

'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/navbar'
import { Footer } from '@/components/layout/Footer'
import { TangramGame } from '@/components/tangram/TangramGame'
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
      <TangramGame mode="daily" />
    </>
  )
}

export default function TangramDailyChallengePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#181A20] transition-colors duration-300 flex flex-col">
      <div className="w-full max-w-[1380px] mx-auto flex-grow flex flex-col pb-0 md:pb-[50px]">
        <Navbar />
        <main className="flex-grow flex flex-col">
          <Suspense fallback={<div className="flex-grow" />}>
            <TangramDailyChallengeContent />
          </Suspense>
        </main>
      </div>
      <Footer />
    </div>
  )
}
