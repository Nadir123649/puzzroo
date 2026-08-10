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
  const [loaderText, setLoaderText] = useState('Loading puzzle...')
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
    loading,
    hintsUsed,
  } = useCrossMath()

  const isGameOver = gameStatus === 'won' || gameStatus === 'lost'

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

  const handleNewGame = async (isReplay = false) => {
    setLoaderText(isReplay ? 'Replaying puzzle...' : 'Loading puzzle...')
    setIsResetting(true)
    setShowModal(false)
    await new Promise(resolve => setTimeout(resolve, 1000))
    if (isReplay) {
      await replayBoard()
    } else {
      await resetBoard()
    }
    setIsResetting(false)
  }

  const handlePlayAgain = () => {
    handleNewGame(true) // Always replay same puzzle on Try Again
  }

  const handleBackToGames = () => {
    setLoaderText('Returning to lobby...')
    setIsResetting(true)
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

  // Cell size: easy mode always uses 56px so the board stays large and
  // the right-panel buttons stay horizontally aligned with the board bottom.
  // Medium/hard boards shrink proportionally to fit the screen.
  const numCols = board[0]?.length || 5
  const targetBoardPx = 300
  const minCellWidth = difficulty === 'easy'
    ? 56
    : Math.max(36, Math.min(50, Math.floor(targetBoardPx / numCols)))

  return (
    <section className={`w-full bg-white dark:bg-[#181A20] transition-colors duration-300 relative ${(isResetting || loading) ? 'pointer-events-none select-none' : ''}`}>
      <div className="w-full px-[20px] flex justify-center">
        <div className="w-full max-w-[1200px] flex flex-col gap-[15px] pb-0 md:pb-[50px]">
          {/* Desktop Layout */}
          <div className="hidden md:flex gap-[30px] lg:gap-[48px] justify-center items-stretch">
            {/* CrossMath Board - Center aligned for easy mode */}
            <div className="flex-shrink-0 relative">
              <CrossMathBoard
                board={board}
                selectedCell={selectedCell}
                onCellClick={selectCell}
                minCellWidth={minCellWidth}
              />
            </div>

            {/* Right Control Panel - 230px width */}
            <div className="w-[230px] flex flex-col gap-[20px]">
              {/* Difficulty Heading */}
              <div className="text-center">
                <span className="font-urbanist text-[11px] text-[#757575] dark:text-[#9E9E9E] uppercase tracking-wider font-bold">
                  Difficulty
                </span>
                <h3 className="font-urbanist text-2xl font-extrabold text-[#212121] dark:text-white capitalize select-none mt-0.5">
                  {difficulty}
                </h3>
              </div>

              {/* Middle Content Wrapper (Stats, Controls, Number Pad) - centered vertically */}
              <div className="flex flex-col gap-[20px] my-auto">
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

                <SudokuControls
                  notesMode={false}
                  availableHints={isGameOver ? 0 : availableHints}
                  onUndo={isGameOver ? () => {} : undoLastMove}
                  onErase={isGameOver ? () => {} : eraseCell}
                  onTogglePencil={() => {}}
                  onHint={isGameOver ? () => {} : requestHint}
                  showPencil={false}
                  showReset={true}
                  disabled={isGameOver}
                  canUndo={canUndo && !isGameOver}
                />

                {/* Number Pad */}
                <CrossMathNumberPad
                  availableNumbers={availableNumbers}
                  onNumberSelect={isGameOver ? () => {} : enterNumber}
                  numbersPerRow={difficulty === 'easy' ? availableNumbers.size : numbersPerRow}
                  usedNumbersCount={usedNumbersCount}
                  requiredNumbersCount={requiredNumbersCount}
                  difficulty={difficulty}
                />
              </div>

              {/* Bottom Actions Section */}
              <div className="w-full flex flex-col gap-[12px] mt-auto">
                {isFromPastPuzzles ? (
                  <button
                    onClick={() => handleNewGame(true)}
                    disabled={isResetting}
                    className="w-full h-[46px] rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-urbanist font-bold text-[16px] transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    Replay Game
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleNewGame(false)}
                      disabled={isResetting}
                      className="w-full h-[46px] rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-urbanist font-bold text-[16px] transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      New Game
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
                 onCellClick={isGameOver ? () => {} : selectCell}
                 mobile
               />
             </div>
 
             {/* Number Pad Mobile */}
             <CrossMathNumberPad
               availableNumbers={availableNumbers}
               onNumberSelect={isGameOver ? () => {} : enterNumber}
               numbersPerRow={numbersPerRow}
               mobile
               usedNumbersCount={usedNumbersCount}
               requiredNumbersCount={requiredNumbersCount}
               difficulty={difficulty}
             />
 
              {/* Feature Buttons Mobile */}
              <SudokuControls
                notesMode={false}
                availableHints={isGameOver ? 0 : availableHints}
                onUndo={isGameOver ? () => {} : undoLastMove}
                onErase={isGameOver ? () => {} : eraseCell}
                onTogglePencil={() => {}}
                onHint={isGameOver ? () => {} : requestHint}
                mobile
                showPencil={false}
                showReset={true}
                disabled={isGameOver}
                canUndo={canUndo && !isGameOver}
              />
              {isFromPastPuzzles ? (
                <button
                  onClick={() => handleNewGame(true)}
                  disabled={isResetting}
                  className="w-full h-[46px] rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-urbanist font-bold text-[16px] transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  Replay Game
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleNewGame(false)}
                    disabled={isResetting}
                    className="w-full h-[46px] rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-urbanist font-bold text-[16px] transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    New Game
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
               case 'hard': return 120
               case 'medium': return 180
               default: return 300
             }
           }
           return getInitialTime(difficulty) - time
         })()}
         mistakes={mistakes}
         maxMistakes={maxMistakes}
         hintsUsed={hintsUsed}
         score={score}
         lossReason={mistakes >= maxMistakes ? 'mistakes' : 'timeout'}
         onPlayAgain={handlePlayAgain}
         onNewGame={!isFromPastPuzzles ? () => handleNewGame(false) : undefined}
         onBackToGames={handleBackToGames}
         onClose={() => setShowModal(false)}
         gameName="CrossMath"
       />
 
       {/* Loading Overlay for New Game */}
       <GameLoader isOpen={isResetting || loading} text={loaderText} />
    </section>
  )
}
