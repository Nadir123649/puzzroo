'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { Loader2 } from 'lucide-react'
import { GameLoader } from '@/components/ui/GameLoader'
import { useCrossMath } from '@/hooks/useCrossMath'
import { CrossMathBoard } from '@/components/games/crossmath/CrossMathBoard'
import { CrossMathNumberPad } from '@/components/games/crossmath/CrossMathNumberPad'
import { SudokuControls } from '@/components/games/sudoku/SudokuControls'
import { SudokuStats } from '@/components/games/sudoku/SudokuStats'
import { SudokuModal } from '@/components/games/sudoku/SudokuModal'
import { FloatingScoreFeedback } from '@/components/games/sudoku/FloatingScoreFeedback'
import { images } from '@/lib/utils'
import { Difficulty } from '@shared/lib/crossmath/types'

export function CrossMathGame() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isResetting, setIsResetting] = useState(false)
  const [loaderText, setLoaderText] = useState('Loading game...')
  const [showModal, setShowModal] = useState(false)
  
  // Check if this is from past puzzles or daily challenge (has date param or daily challenge route)
  const dateParam = searchParams?.get('date')
  const isFromPastPuzzles = !!dateParam || (typeof window !== 'undefined' && window.location.pathname.includes('/daily-challenge/'))
  
  const {
    board,
    selectedCell,
    mistakes,
    maxMistakes,
    score,
    time,
    gameStatus,
    difficulty,
    availableNumbers,
    usedNumbersCount,
    requiredNumbersCount,
    scoreFeedbacks,
    availableHints,
    selectCell,
    enterNumber,
    eraseCell,
    undoLastMove,
    resetBoard,
    replayBoard,
    requestHint,
    handleFeedbackComplete,
    canUndo,
  } = useCrossMath()

  // Show modal when game ends
  useEffect(() => {
    if (gameStatus === 'won' || gameStatus === 'lost') {
      const timer = setTimeout(() => {
        setShowModal(true)
      }, 500)
      return () => clearTimeout(timer)
    } else {
      setShowModal(false)
    }
  }, [gameStatus])

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

  const handleNewGame = async (isReplay = false) => {
    setLoaderText(isReplay ? 'Replaying game...' : 'Loading game...')
    setIsResetting(true)
    setShowModal(false)
    await new Promise(resolve => setTimeout(resolve, 1000))
    if (isReplay) {
      replayBoard()
    } else {
      resetBoard()
    }
    setIsResetting(false)
  }

  const handlePlayAgain = () => {
    handleNewGame(isFromPastPuzzles)
  }

  const handleBackToGames = () => {
    const params = new URLSearchParams(window.location.search)
    const hasDate = params.has('date')
    const returnUrl = hasDate ? (typeof window !== 'undefined' ? sessionStorage.getItem('puzzroo_return_url') : null) : null
    if (returnUrl) {
      sessionStorage.removeItem('puzzroo_return_url')
      router.push(returnUrl)
    } else {
      router.push('/game/cross-math')
    }
  }

  // Determine numbers per row based on difficulty
  const getNumbersPerRow = (diff: Difficulty): number => {
    switch (diff) {
      case 'easy':
        return 3
      case 'medium':
        return 4
      case 'hard':
        return 5
      default:
        return 3
    }
  }

  const numbersPerRow = getNumbersPerRow(difficulty)

  return (
    <section className="w-full bg-white dark:bg-[#181A20] transition-colors duration-300 relative">
      <div className="w-full px-[20px] flex justify-center">
        <div className="w-full max-w-[1200px] flex flex-col gap-[15px] pb-0 md:pb-[50px]">
          
          {/* Desktop Layout */}
          <div className="hidden md:flex gap-[30px] lg:gap-[48px] justify-center items-center">
            {/* CrossMath Board - Center aligned for easy mode */}
            <div className="flex-shrink-0 relative">
              <CrossMathBoard
                board={board}
                selectedCell={selectedCell}
                onCellClick={selectCell}
              />
              {/* Floating Score Feedback */}
              <FloatingScoreFeedback
                feedbacks={scoreFeedbacks}
                onComplete={handleFeedbackComplete}
              />
            </div>

            {/* Right Control Panel - 230px width */}
            <div className="w-[230px] flex flex-col gap-[20px]">
              {/* Stats */}
              <div className="relative overflow-visible">
                <SudokuStats
                  mistakes={mistakes}
                  maxMistakes={maxMistakes}
                  score={score}
                  time={time}
                />
                {/* Floating Score Feedback */}
                <FloatingScoreFeedback
                  feedbacks={scoreFeedbacks}
                  onComplete={handleFeedbackComplete}
                />
              </div>

              {/* Feature Buttons */}
              <SudokuControls
                notesMode={false}
                availableHints={availableHints}
                onUndo={undoLastMove}
                onErase={eraseCell}
                onTogglePencil={() => {}}
                onHint={requestHint}
                showPencil={false}
                canUndo={canUndo}
                showReplay={true}
                onReplay={replayBoard}
              />

              {/* Number Pad */}
              <CrossMathNumberPad
                availableNumbers={availableNumbers}
                onNumberSelect={enterNumber}
                numbersPerRow={numbersPerRow}
                usedNumbersCount={usedNumbersCount}
                requiredNumbersCount={requiredNumbersCount}
              />

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
                 <>
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

                   <button
                     onClick={() => handleNewGame(true)}
                     disabled={isResetting}
                     className="w-full h-[46px] rounded-full border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[#F0EDFF] dark:hover:bg-[#35383F] font-urbanist font-bold text-[16px] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                   >
                     Replay
                   </button>
                 </>
               )}
             </div>
           </div>
 
           {/* Mobile Layout */}
           <div className="md:hidden flex flex-col gap-[16px] items-center pb-[50px]">
             {/* Stats Row */}
             <div className="w-full relative overflow-visible">
               <SudokuStats
                 mistakes={mistakes}
                 maxMistakes={maxMistakes}
                 score={score}
                 time={time}
                 mobile
               />
               {/* Floating Score Feedback Mobile */}
               <FloatingScoreFeedback
                 feedbacks={scoreFeedbacks}
                 onComplete={handleFeedbackComplete}
               />
             </div>
 
             {/* CrossMath Board */}
             <div className="w-full relative">
               <CrossMathBoard
                 board={board}
                 selectedCell={selectedCell}
                 onCellClick={selectCell}
                 mobile
               />
             </div>
 
             {/* Number Pad Mobile */}
             <CrossMathNumberPad
               availableNumbers={availableNumbers}
               onNumberSelect={enterNumber}
               numbersPerRow={numbersPerRow}
               mobile
               usedNumbersCount={usedNumbersCount}
               requiredNumbersCount={requiredNumbersCount}
             />
 
              {/* Feature Buttons Mobile */}
              <SudokuControls
                notesMode={false}
                availableHints={availableHints}
                onUndo={undoLastMove}
                onErase={eraseCell}
                onTogglePencil={() => {}}
                onHint={requestHint}
                mobile
                showPencil={false}
                canUndo={canUndo}
                showReplay={true}
                onReplay={replayBoard}
              />

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
                <>
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

                  <button
                    onClick={() => handleNewGame(true)}
                    disabled={isResetting}
                    className="w-full h-[46px] rounded-full border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[#F0EDFF] dark:hover:bg-[#35383F] font-urbanist font-bold text-[16px] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    Replay
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

       <SudokuModal
         isOpen={showModal}
         type={gameStatus === 'won' ? 'win' : 'gameOver'}
         time={(() => {
           const getInitialTime = (diff: string) => {
             switch (diff) {
               case 'hard': return 600
               case 'medium': return 420
               default: return 300
             }
           }
           return getInitialTime(difficulty) - time
         })()}
         mistakes={mistakes}
         maxMistakes={maxMistakes}
         score={score}
         onPlayAgain={handlePlayAgain}
         onNewGame={!isFromPastPuzzles ? () => handleNewGame(false) : undefined}
         onBackToGames={handleBackToGames}
         onClose={() => setShowModal(false)}
         gameName="CrossMath"
       />
 
       {/* Loading Overlay for New Game */}
       <GameLoader isOpen={isResetting} text={loaderText} />
    </section>
  )
}
