'use client'

import { Suspense } from 'react'
import Navbar from '@/components/layout/navbar'
import { Footer } from '@/components/layout/Footer'
import { ChessSetup } from '@/components/chess/setup/ChessSetup'

export default function ChessSetupPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#181A20] transition-colors duration-300 flex flex-col">
      <div className="w-full max-w-[1380px] mx-auto flex-grow flex flex-col pb-0 md:pb-[50px]">
        <Navbar />
        <main className="flex-grow flex flex-col">
          <Suspense fallback={<div className="flex-grow" />}>
            <ChessSetup />
          </Suspense>
        </main>
      </div>
      <Footer />
    </div>
  )
}
