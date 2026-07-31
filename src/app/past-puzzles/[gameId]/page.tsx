'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { PastPuzzlesContent } from '@/components/past-puzzles/PastPuzzlesContent'
import { GameLoader } from '@/components/ui/GameLoader'

export default function PastPuzzlesPage() {
  const params = useParams()
  const gameId = params.gameId as 'sudoku' | 'cross-math' | 'nonogram' | 'tangram'

  return (
    <Suspense fallback={<GameLoader isOpen={true} text="Loading past puzzles..." />}>
      <PastPuzzlesContent gameId={gameId} />
    </Suspense>
  )
}
