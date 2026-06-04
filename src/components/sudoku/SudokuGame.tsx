'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'
import { useSudoku } from '@/hooks/useSudoku'
import { SudokuBoard } from '@/components/games/sudoku/SudokuBoard'
import { SudokuNumberPad } from '@/components/games/sudoku/SudokuNumberPad'
import { SudokuControls } from '@/components/games/sudoku/SudokuControls'
import { SudokuStats } from '@/components/games/sudoku/SudokuStats'
import { SudokuModal } from '@/components/games/sudoku/SudokuModal'
import { FloatingScoreFeedback } from '@/components/games/sudoku/FloatingScoreFeedback'
import { images } from '@/lib/utils'

export function SudokuGame() {
  const router = useRouter()
  const [isResetting, setIsResetting] = useState(false)
  
  const {
    board,
    selectedCell,
    selectedNumber,
    notesMode,
    mistakes,
    maxMistakes,
    score,
    time,
    gameStatus,
    isWinAnimating,
    availableHints,
    scoreFeedbacks,
    selectCell,
    selectNumber,
    eraseCell,
    resetBoard,
    toggleNotesMode,
    requestHint,
    removeScoreFeedback,
  } = useSudoku()

  const handleBackToGames = () => {
    router.push('/game/sudoku')
  }

  const handleNewGame = async () => {
    setIsResetting(true)
    // Show loading for 2-3 seconds
    await new Promise(resolve => setTimeout(resolve, 2500))
    resetBoard()
    setIsResetting(false)
  }

  return (
    <section className="w-full bg-white dark:bg-[#181A20] transition-colors duration-300 relative">
      <div className="w-full px-[20px] flex justify-center">
        <div className="w-full max-w-[717.5px] flex flex-col gap-[30px] pb-0 md:pb-[50px]">
          
          {/* Desktop Layout */}
          <div className="hidden md:flex gap-[30px] justify-center">
            {/* Sudoku Board with Win Animation */}
            <div 
              className={`flex-shrink-0 transition-all duration-1000 ease-out ${
                isWinAnimating 
                  ? 'scale-105 drop-shadow-[0_0_30px_rgba(105,73,255,0.6)]' 
                  : ''
              }`}
            >
              <SudokuBoard
                board={board}
                selectedCell={selectedCell}
                selectedNumber={selectedNumber}
                onCellClick={selectCell}
              />
            </div>

            {/* Right Control Panel */}
            <div className="w-[230px] flex flex-col gap-[20px]">
              {/* Stats with Floating Score */}
              <div className="relative">
                <SudokuStats
                  mistakes={mistakes}
                  maxMistakes={maxMistakes}
                  score={score}
                  time={time}
                />
                <FloatingScoreFeedback
                  feedbacks={scoreFeedbacks}
                  onComplete={removeScoreFeedback}
                />
              </div>

              {/* Feature Buttons */}
              <SudokuControls
                notesMode={notesMode}
                availableHints={availableHints}
                onUndo={handleNewGame}
                onErase={eraseCell}
                onTogglePencil={toggleNotesMode}
                onHint={requestHint}
              />

              {/* Number Pad */}
              <SudokuNumberPad
                selectedNumber={selectedNumber}
                onNumberSelect={selectNumber}
              />

              {/* New Game Button */}
              <button
                onClick={handleNewGame}
                disabled={isResetting}
                className="w-full h-[46px] rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-urbanist font-bold text-[16px] transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isResetting ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Loading...</span>
                  </>
                ) : (
                  'New Game'
                )}
              </button>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden flex flex-col gap-[16px] items-center pb-[50px]">
            {/* Stats Row */}
            <SudokuStats
              mistakes={mistakes}
              maxMistakes={maxMistakes}
              score={score}
              time={time}
              mobile
            />

            {/* Sudoku Board with Win Animation */}
            <div 
              className={`transition-all duration-1000 ease-out ${
                isWinAnimating 
                  ? 'scale-105 drop-shadow-[0_0_30px_rgba(105,73,255,0.6)]' 
                  : ''
              }`}
            >
              <SudokuBoard
                board={board}
                selectedCell={selectedCell}
                selectedNumber={selectedNumber}
                onCellClick={selectCell}
                mobile
              />
            </div>

            {/* Number Pad Mobile */}
            <SudokuNumberPad
              selectedNumber={selectedNumber}
              onNumberSelect={selectNumber}
              mobile
            />

            {/* Feature Buttons Mobile */}
            <SudokuControls
              notesMode={notesMode}
              availableHints={availableHints}
              onUndo={handleNewGame}
              onErase={eraseCell}
              onTogglePencil={toggleNotesMode}
              onHint={requestHint}
              mobile
            />

            {/* New Game Button Mobile */}
            <button
              onClick={handleNewGame}
              disabled={isResetting}
              className="w-full max-w-[350px] h-[46px] rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-urbanist font-bold text-[16px] transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isResetting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Loading...</span>
                </>
              ) : (
                'New Game'
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Loading Overlay for New Game */}
      {isResetting && (
        <div className="absolute inset-0 bg-white/80 dark:bg-[#181A20]/80 backdrop-blur-sm flex items-center justify-center z-40">
          <div className="flex flex-col items-center gap-4">
            {/* Puzzroo Logo + Text */}
            <div className="flex items-center gap-3">
              <Image
                src={images.logo}
                alt="Puzzroo Logo"
                width={40}
                height={40}
                className="w-10 h-10 rounded-lg"
              />
              <span className="font-urbanist text-[32px] font-extrabold tracking-tight text-[#181A20] dark:text-white">
                Puzzroo
              </span>
            </div>
            
            <Loader2 className="animate-spin text-[var(--color-primary)]" size={48} />
            <p className="font-urbanist text-lg font-semibold text-[var(--color-primary)]">
              Loading New Game...
            </p>
          </div>
        </div>
      )}

      {/* Win Modal */}
      <SudokuModal
        isOpen={gameStatus === 'won'}
        type="win"
        time={time}
        mistakes={mistakes}
        score={score}
        onPlayAgain={handleNewGame}
        onBackToGames={handleBackToGames}
      />

      {/* Game Over Modal */}
      <SudokuModal
        isOpen={gameStatus === 'lost'}
        type="gameOver"
        score={score}
        onPlayAgain={handleNewGame}
        onBackToGames={handleBackToGames}
      />
    </section>
  )
}
