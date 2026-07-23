'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Navbar from '@/components/layout/navbar'
import { Footer } from '@/components/layout/Footer'
import { NonogramHero } from '@/components/nonogram/NonogramHero'
import { NonogramGame } from '@/components/nonogram/NonogramGame'
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
  return (
    <div className="min-h-screen bg-white dark:bg-[#181A20] transition-colors duration-300 flex flex-col">
      <div className="w-full max-w-[1380px] mx-auto flex-grow flex flex-col pb-0 md:pb-[50px]">
        <Navbar />
        <main className="flex-grow flex flex-col">
          <Suspense fallback={<div className="flex-grow" />}>
            <NonogramContent />
          </Suspense>
        </main>
      </div>
      <Footer />
    </div>
  )
}
