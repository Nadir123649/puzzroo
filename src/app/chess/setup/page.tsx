'use client'

import { Suspense } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { ChessSetup } from '@/components/chess/setup/ChessSetup'

export default function ChessSetupPage() {
  return (
    <AppLayout>
      <main className="flex-grow flex flex-col">
        <Suspense fallback={<div className="flex-grow" />}>
          <ChessSetup />
        </Suspense>
      </main>
    </AppLayout>
  )
}
