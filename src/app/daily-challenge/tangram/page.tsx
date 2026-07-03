/**
 * Tangram Daily Challenge Page
 * Daily challenge for Tangram game
 */

'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/layout/navbar'
import { Footer } from '@/components/layout/Footer'
import { TangramHero } from '@/components/tangram/TangramHero'
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
      <section className="w-full bg-white dark:bg-[#181A20] transition-colors duration-300 pt-[20px] md:pt-[40px] pb-[20px]">
        <div className="w-full px-[20px]">
          <div className="flex flex-col gap-[20px] md:gap-[30px]">
            {/* Title */}
            <h1 className="font-urbanist font-extrabold text-[32px] md:text-[48px] leading-[120%] text-[#212121] dark:text-white text-center">
              Tangram Daily Challenge
            </h1>

            {/* Description */}
            <p className="font-urbanist text-[14px] md:text-[16px] leading-[160%] text-[#616161] dark:text-[#BDBDBD] text-center max-w-[600px] mx-auto">
              Complete today's unique Tangram puzzle and compete with players worldwide!
            </p>
          </div>
        </div>
      </section>
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
