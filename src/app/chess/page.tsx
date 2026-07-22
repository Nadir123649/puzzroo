'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Navbar from '@/components/layout/navbar'
import { Footer } from '@/components/layout/Footer'
import { ChessHero } from '@/components/chess/ChessHero'
import { ChessGame } from '@/components/chess/ChessGame'
import { markGameAsPlayed } from '@/components/sections/FreeGames'
import { BoardThemeId } from '@/utils/chess'
import { PieceThemeId } from '@/components/chess/SvgChessPiece'

function ChessContent() {
  const [mounted, setMounted] = useState(false)
  const searchParams = useSearchParams()
  const [difficulty, setDifficulty] = useState('easy')
  const [initialBoardTheme, setInitialBoardTheme] = useState<BoardThemeId>('classic')
  const [initialPieceTheme, setInitialPieceTheme] = useState<PieceThemeId>('classic')
  const [customWhite, setCustomWhite] = useState('#FFFFFF')
  const [customBlack, setCustomBlack] = useState('#010101')

  useEffect(() => {
    setMounted(true)
    markGameAsPlayed('chess')

    // Read from searchParams or sessionStorage
    const diff = searchParams.get('difficulty') || (typeof window !== 'undefined' ? sessionStorage.getItem('chess_difficulty') : null) || 'easy'
    if (['easy', 'medium', 'hard'].includes(diff)) {
      setDifficulty(diff)
    }

    const theme = searchParams.get('theme') as BoardThemeId || (typeof window !== 'undefined' ? sessionStorage.getItem('chess_board_theme') as BoardThemeId : null) || 'classic'
    if (['classic', 'green', 'brown', 'dark'].includes(theme)) {
      setInitialBoardTheme(theme)
    }

    const pt = searchParams.get('pieceTheme') as PieceThemeId || (typeof window !== 'undefined' ? sessionStorage.getItem('chess_piece_theme') as PieceThemeId : null) || 'classic'
    if (['classic', 'gold', 'neon', 'emerald', 'custom'].includes(pt)) {
      setInitialPieceTheme(pt)
    }

    if (typeof window !== 'undefined') {
      const cw = sessionStorage.getItem('chess_custom_white')
      if (cw) setCustomWhite(cw)
      const cb = sessionStorage.getItem('chess_custom_black')
      if (cb) setCustomBlack(cb)
    }
  }, [searchParams])

  if (!mounted) {
    return null
  }

  return (
    <ChessGame
      initialDifficulty={difficulty}
      initialBoardTheme={initialBoardTheme}
      initialPieceTheme={initialPieceTheme}
      initialCustomWhite={customWhite}
      initialCustomBlack={customBlack}
    />
  )
}

export default function ChessPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#181A20] transition-colors duration-300 flex flex-col">
      <div className="w-full max-w-[1380px] mx-auto flex-grow flex flex-col pb-0 md:pb-[50px]">
        <Navbar />
        <main className="flex-grow flex flex-col">
          <Suspense fallback={<div className="flex-grow" />}>
            <ChessContent />
          </Suspense>
        </main>
      </div>
      <Footer />
    </div>
  )
}
