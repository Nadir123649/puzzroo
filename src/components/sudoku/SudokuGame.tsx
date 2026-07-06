'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'
import { GameLoader } from '@/components/ui/GameLoader'
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
  const searchParams = useSearchParams()
  const [isResetting, setIsResetting] = useState(false)
  const [loaderText, setLoaderText] = useState('Loading game...')
  const [showModal, setShowModal] = useState(false)
  
  // Check if this is from past puzzles or daily challenge (has date param)
  const dateParam = searchParams?.get('date')
  const isFromPastPuzzles = !!dateParam
  
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
    difficulty,
    selectCell,
    selectNumber,
    eraseCell,
    resetBoard,
    toggleNotesMode,
    requestHint,
    removeScoreFeedback,
  } = useSudoku()

  // Prevent scroll when loading overlay is active (New Game loading)
  useEffect(() => {
    if (isResetting) {
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
    } else {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
    return () => {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }
  }, [isResetting])

  // Show modal automatically when game is won or lost
  useEffect(() => {
    if (gameStatus === 'won' || gameStatus === 'lost') {
      setShowModal(true)
    } else {
      setShowModal(false)
    }
  }, [gameStatus])

  const handleBackToGames = () => {
    const params = new URLSearchParams(window.location.search)
    const hasDate = params.has('date')
    const returnUrl = hasDate ? (typeof window !== 'undefined' ? sessionStorage.getItem('puzzroo_return_url') : null) : null
    if (returnUrl) {
      sessionStorage.removeItem('puzzroo_return_url')
      router.push(returnUrl)
    } else {
      router.push('/game/sudoku')
    }
  }

  const handleNewGame = async (isReplay = false) => {
    setLoaderText(isReplay ? 'Replaying game...' : 'Loading game...')
    setIsResetting(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    resetBoard()
    setIsResetting(false)
  }

  return (
    <section className="w-full bg-white dark:bg-[#181A20] transition-colors duration-300 relative">
      <div className="w-full px-[20px] flex justify-center">
        <div className="w-full max-w-[717.5px] flex flex-col gap-[15px] pb-0 md:pb-[50px]">
          
          {/* Desktop Layout */}
          <div className="hidden md:flex gap-[30px] justify-center items-start">
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

            {/* Right Control Panel - All 230px width */}
            <div className="w-[230px] flex flex-col gap-[20px]">
              {/* Stats with Floating Score */}
              <div className="relative overflow-visible">
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
                onUndo={() => handleNewGame(true)}
                onErase={eraseCell}
                onTogglePencil={toggleNotesMode}
                onHint={requestHint}
              />

              {/* Number Pad */}
              <SudokuNumberPad
                selectedNumber={selectedNumber}
                onNumberSelect={selectNumber}
              />

              {/* Action Button - New Game or Replay Game */}
              {isFromPastPuzzles ? (
                <button
                  onClick={() => handleNewGame(true)}
                  disabled={isResetting}
                  className="w-full h-[46px] rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-urbanist font-bold text-[16px] transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      <span>Loading...</span>
                    </>
                  ) : (
                    'Replay Game'
                  )}
                </button>
              ) : (
                <button
                  onClick={() => handleNewGame(false)}
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
              )}
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden flex flex-col gap-[16px] items-center pb-[50px]">
            {/* Stats Row - No padding, aligns with navbar, with Floating Score */}
            <div className="w-full relative overflow-visible">
              <SudokuStats
                mistakes={mistakes}
                maxMistakes={maxMistakes}
                score={score}
                time={time}
                mobile
              />
              <FloatingScoreFeedback
                feedbacks={scoreFeedbacks}
                onComplete={removeScoreFeedback}
              />
            </div>

            {/* Sudoku Board with Win Animation - No padding, full width */}
            <div 
              className={`w-full transition-all duration-1000 ease-out ${
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

            {/* Number Pad Mobile - No padding */}
            <SudokuNumberPad
              selectedNumber={selectedNumber}
              onNumberSelect={selectNumber}
              mobile
            />

            {/* Feature Buttons Mobile - No padding */}
            <SudokuControls
              notesMode={notesMode}
              availableHints={availableHints}
              onUndo={() => handleNewGame(true)}
              onErase={eraseCell}
              onTogglePencil={toggleNotesMode}
              onHint={requestHint}
              mobile
            />

             {/* Action Button Mobile - New Game or Replay Game */}
             {isFromPastPuzzles ? (
               <button
                 onClick={() => handleNewGame(true)}
                 disabled={isResetting}
                 className="w-full h-[46px] rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-urbanist font-bold text-[16px] transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
               >
                 {isResetting ? (
                   <>
                     <Loader2 className="animate-spin" size={20} />
                     <span>Loading...</span>
                   </>
                 ) : (
                   'Replay Game'
                 )}
               </button>
             ) : (
               <button
                 onClick={() => handleNewGame(false)}
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
             )}
          </div>

        </div>
      </div>

      {/* Loading Overlay for New Game */}
      <GameLoader isOpen={isResetting} text={loaderText} />

      {/* Win Modal */}
      <SudokuModal
        isOpen={gameStatus === 'won' && showModal}
        type="win"
        time={time}
        mistakes={mistakes}
        maxMistakes={maxMistakes}
        score={score}
        onPlayAgain={() => handleNewGame(true)}
        onNewGame={() => handleNewGame(false)}
        onBackToGames={handleBackToGames}
        onClose={() => setShowModal(false)}
      />

      {/* Game Over Modal */}
      <SudokuModal
        isOpen={gameStatus === 'lost' && showModal}
        type="gameOver"
        time={time}
        mistakes={mistakes}
        maxMistakes={maxMistakes}
        score={score}
        onPlayAgain={() => handleNewGame(true)}
        onNewGame={() => handleNewGame(false)}
        onBackToGames={handleBackToGames}
        onClose={() => setShowModal(false)}
      />
    </section>
  )
}
