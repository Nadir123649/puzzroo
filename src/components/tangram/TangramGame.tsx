/**
 * Tangram Game Component
 * Phase 3: Complete gameplay with countdown, hints, scoring
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Lightbulb, RotateCcw, Undo } from 'lucide-react'
import { images } from '@/lib/utils'
import { polygonToSVGPath } from '@/lib/tangram/polygon-renderer'
import { usePolygonTangram } from '@/hooks/usePolygonTangram'
import { TangramBoard } from '@/components/games/tangram/TangramBoard'
import { PolygonPiece } from '@/components/games/tangram/PolygonPiece'
import { TangramModal } from '@/components/games/tangram/TangramModal'
import { CountdownTimer } from '@/components/games/tangram/CountdownTimer'
import { HintButton } from '@/components/games/tangram/HintButton'
import { PolygonHintGhost } from '@/components/games/tangram/PolygonHintGhost'

import { TangramPieceId } from '@/types/tangram-polygon'
import { TangramDifficulty } from '@/data/tangram'

const MAX_HINTS = 3

interface TangramGameProps {
  mode?: 'normal' | 'daily' | 'past'
  puzzleId?: string
}

export function TangramGame({ mode = 'normal', puzzleId }: TangramGameProps = {}) {
  const searchParams = useSearchParams()
  const difficulty = (searchParams?.get('difficulty') as TangramDifficulty) || 'easy'
  
  const [isResetting, setIsResetting] = useState(false)
  const [mobileBoardWidth, setMobileBoardWidth] = useState(350)
  const [desktopBoardWidth, setDesktopBoardWidth] = useState(700)
  const router = useRouter()
  const mobileBoardRef = useRef<HTMLDivElement>(null)
  const desktopBoardRef = useRef<HTMLDivElement>(null)

  const {
    puzzle,
    pieces,
    selectedPiece,
    gameStatus,
    timeRemaining,
    score,
    hintsUsed,
    hintPiece,
    availableHints,
    isSolved,
    scaledData,
    selectPiece,
    movePiece,
    rotateLeft,
    rotateRight,
    requestHint,
    autoFill,
    resetGame,
    newGame,
    replayPuzzle,
    undoLastMove
  } = usePolygonTangram(difficulty)

  // Track mobile board rendered width
  useEffect(() => {
    if (!mobileBoardRef.current) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setMobileBoardWidth(entry.contentRect.width)
      }
    })
    observer.observe(mobileBoardRef.current)
    return () => observer.disconnect()
  }, [])

  // Track desktop board rendered width
  useEffect(() => {
    if (!desktopBoardRef.current) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDesktopBoardWidth(entry.contentRect.width)
      }
    })
    observer.observe(desktopBoardRef.current)
    return () => observer.disconnect()
  }, [])

  const handleNewGame = async () => {
    setIsResetting(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    newGame()
    setIsResetting(false)
  }

  const handleRetry = async () => {
    setIsResetting(true)
    await new Promise(resolve => setTimeout(resolve, 500))
    replayPuzzle()
    setIsResetting(false)
  }

  const handleReplay = () => {
    replayPuzzle()
  }

  const handleUndo = () => {
    undoLastMove()
  }

  const handleAutoFill = () => {
    autoFill()
  }

  const handleBackToLobby = () => {
    router.push('/game/tangram')
  }

  const handlePieceSelect = (pieceId: TangramPieceId) => {
    selectPiece(pieceId)
  }

  const handlePieceMove = (pieceId: TangramPieceId, x: number, y: number, onSnapSuccess?: () => void) => {
    movePiece(pieceId, x, y, onSnapSuccess)
  }

  const handlePieceRotateLeft = () => {
    if (selectedPiece) rotateLeft()
  }

  const handlePieceRotateRight = () => {
    if (selectedPiece) rotateRight()
  }

  const handleRequestHint = () => {
    requestHint()
  }

  // Get hint piece data from polygon pieces
  const hintPieceData = hintPiece ? pieces.find(p => p.id === hintPiece) : null

  // Get silhouette path from scaled polygon data
  const silhouettePath = scaledData ? polygonToSVGPath(scaledData.polygon) : undefined

  // Check if any pieces are placed for undo functionality
  const hasPlacedPieces = pieces.some(p => p.isPlaced)

  return (
    <section className="w-full bg-white dark:bg-[#181A20] transition-colors duration-300 relative">
      <div className="w-full max-w-[1380px] mx-auto px-[20px] flex justify-center overflow-visible">
        <div className="w-full flex flex-col gap-[20px] pb-0 md:pb-[10px] max-w-full overflow-visible">

          {/* Desktop Layout */}
          <div className="hidden md:flex gap-[30px] justify-center items-start overflow-visible">

            {/* LEFT SIDE - BOARD */}
            <div ref={desktopBoardRef} className="flex-1 max-w-[700px] min-w-[320px] overflow-visible">
              <TangramBoard silhouette={silhouettePath}>
                {/* Hint Ghost */}
                {hintPiece && hintPieceData && (
                  <PolygonHintGhost
                    pieceId={hintPiece}
                    targetPolygon={hintPieceData.targetPolygon}
                    color={hintPieceData.color}
                    boardContainerWidth={desktopBoardWidth}
                  />
                )}
                
                {/* Actual Pieces */}
                {pieces.map((piece) => (
                  <PolygonPiece
                    key={piece.id}
                    piece={piece}
                    isSelected={selectedPiece === piece.id}
                    onSelect={() => handlePieceSelect(piece.id)}
                    onMove={(x, y, onSnapSuccess) => handlePieceMove(piece.id, x, y, onSnapSuccess)}
                    onRotateLeft={handlePieceRotateLeft}
                    onRotateRight={handlePieceRotateRight}
                    boardContainerWidth={desktopBoardWidth}
                    allPieces={pieces}
                  />
                ))}
              </TangramBoard>
            </div>

            {/* RIGHT SIDE - CONTROLS PANEL */}
            <div 
              className="flex-shrink-0 w-[230px] flex flex-col justify-between sticky top-[100px]"
              style={{ height: `${(desktopBoardWidth * 493) / 750}px` }}
            >
              {/* Stats Section - Sudoku style */}
              <div className="w-full flex flex-col gap-[12px]">
                {/* Difficulty Heading - centered, bold, larger */}
                {puzzle && (
                  <div className="text-center">
                    <h3 className="font-urbanist text-3xl font-extrabold text-[#212121] dark:text-white capitalize select-none">
                      {puzzle.difficulty}
                    </h3>
                  </div>
                )}

                {/* Score and Time Row */}
                <div className="flex justify-between items-center">
                  {/* Score - Left */}
                  <div className="flex flex-col items-start">
                    <span className="font-urbanist text-sm font-medium text-[#757575] dark:text-[#9E9E9E]">
                      Score
                    </span>
                    <span className="font-urbanist text-xl font-bold text-[var(--color-primary)]">
                      {score}
                    </span>
                  </div>

                  {/* Time Remaining - Right */}
                  <div className="flex flex-col items-end">
                    <span className="font-urbanist text-sm font-medium text-[#757575] dark:text-[#9E9E9E]">
                      Time
                    </span>
                    <CountdownTimer timeRemaining={timeRemaining} className="text-xl" />
                  </div>
                </div>

                {/* Feature Row - Hint + Replay + Undo (Sudoku style) */}
                <div className="w-[230px] h-[50.31px] flex justify-between items-center gap-[8px]">
                  {/* Hint Button */}
                  <button
                    onClick={handleRequestHint}
                    disabled={gameStatus !== 'playing' || availableHints === 0}
                    className="relative w-[50.31px] h-[50.31px] rounded-full bg-[#F0EDFF] dark:bg-[#F0EDFF] flex items-center justify-center hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    title={`${availableHints} hint${availableHints !== 1 ? 's' : ''} remaining`}
                    aria-label="Hint"
                  >
                    <Lightbulb size={27} strokeWidth={2} className="text-[#424242]" />
                    {/* Hint Badge */}
                    {availableHints > 0 && (
                      <span className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-[#A592FF] rounded-full border-2 border-white dark:border-[#181A20] flex items-center justify-center z-10">
                        <span className="font-urbanist font-bold text-white text-[9px]">
                          {availableHints}
                        </span>
                      </span>
                    )}
                  </button>

                  {/* Replay Button */}
                  <button
                    onClick={handleReplay}
                    disabled={gameStatus !== 'playing'}
                    className="w-[50.31px] h-[50.31px] rounded-full bg-[#F0EDFF] dark:bg-[#F0EDFF] flex items-center justify-center hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Restart same puzzle"
                    aria-label="Replay"
                  >
                    <RotateCcw size={27} strokeWidth={2} className="text-[#424242]" />
                  </button>

                  {/* Undo Button */}
                  <button
                    onClick={handleUndo}
                    disabled={gameStatus !== 'playing' || !hasPlacedPieces}
                    className="w-[50.31px] h-[50.31px] rounded-full bg-[#F0EDFF] dark:bg-[#F0EDFF] flex items-center justify-center hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Undo last move"
                    aria-label="Undo"
                  >
                    <Undo size={27} strokeWidth={2} className="text-[#424242]" />
                  </button>
                </div>
              </div>

              {/* Bottom Actions Section */}
              <div className="w-full flex flex-col gap-[12px]">
                {/* Auto Fill Button (Development Only) */}
                {process.env.NODE_ENV === 'development' && (
                  <button
                    onClick={handleAutoFill}
                    disabled={isResetting || isSolved}
                    className="w-full h-[46px] rounded-full border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[#F0EDFF] dark:hover:bg-[#35383F] font-urbanist font-bold text-[16px] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Auto Fill
                  </button>
                )}

                {/* New Game / Replay Button */}
                <button
                  onClick={mode === 'normal' ? handleNewGame : handleReplay}
                  disabled={isResetting}
                  className="w-full h-[46px] rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-urbanist font-bold text-[16px] transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="animate-spin" size={20} />
                      <span>Loading...</span>
                    </>
                  ) : (
                    mode === 'normal' ? 'New Game' : 'Replay'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden flex flex-col gap-[16px] items-center pb-[50px]">
            {/* Timer & Score Row */}
            <div className="w-full grid grid-cols-2 gap-3">
              <div className="bg-[#F0EDFF] dark:bg-[#1F222A] rounded-xl p-3 flex flex-col items-center gap-1">
                <span className="font-urbanist text-xs font-medium text-[#757575] dark:text-[#9E9E9E]">
                  Time
                </span>
                <CountdownTimer timeRemaining={timeRemaining} className="text-xl" />
              </div>
              <div className="bg-[#F0EDFF] dark:bg-[#1F222A] rounded-xl p-3 flex flex-col items-center gap-1">
                <span className="font-urbanist text-xs font-medium text-[#757575] dark:text-[#9E9E9E]">
                  Score
                </span>
                <span className="font-urbanist text-xl font-bold text-[var(--color-primary)]">
                  {score}
                </span>
              </div>
            </div>

            {/* Board */}
            <div ref={mobileBoardRef} className="w-full">
              <TangramBoard mobile silhouette={silhouettePath}>
                {/* Hint Ghost */}
                {hintPiece && hintPieceData && (
                  <PolygonHintGhost
                    pieceId={hintPiece}
                    targetPolygon={hintPieceData.targetPolygon}
                    color={hintPieceData.color}
                    boardContainerWidth={mobileBoardWidth}
                  />
                )}
                
                {/* Actual Pieces */}
                {pieces.map((piece) => (
                  <PolygonPiece
                    key={piece.id}
                    piece={piece}
                    isSelected={selectedPiece === piece.id}
                    onSelect={() => handlePieceSelect(piece.id)}
                    onMove={(x, y, onSnapSuccess) => handlePieceMove(piece.id, x, y, onSnapSuccess)}
                    onRotateLeft={handlePieceRotateLeft}
                    onRotateRight={handlePieceRotateRight}
                    boardContainerWidth={mobileBoardWidth}
                    allPieces={pieces}
                  />
                ))}
              </TangramBoard>
            </div>

            {/* Feature Row Mobile - Hint + Replay + Undo */}
            <div className="w-full flex justify-between items-center px-4">
              {/* Hint Button */}
              <button
                onClick={handleRequestHint}
                disabled={gameStatus !== 'playing' || availableHints === 0}
                className="relative w-[63.44px] h-[63.44px] rounded-full bg-[#F0EDFF] dark:bg-[#F0EDFF] flex items-center justify-center hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                title={`${availableHints} hint${availableHints !== 1 ? 's' : ''} remaining`}
                aria-label="Hint"
              >
                <Lightbulb size={34} strokeWidth={2} className="text-[#424242]" />
                {/* Hint Badge */}
                {availableHints > 0 && (
                  <span className="absolute -top-1 -right-1 w-[20px] h-[20px] bg-[#A592FF] rounded-full border-2 border-white dark:border-[#181A20] flex items-center justify-center z-10">
                    <span className="font-urbanist font-bold text-white text-[10px]">
                      {availableHints}
                    </span>
                  </span>
                )}
              </button>

              {/* Replay Button */}
              <button
                onClick={handleReplay}
                disabled={gameStatus !== 'playing'}
                className="w-[63.44px] h-[63.44px] rounded-full bg-[#F0EDFF] dark:bg-[#F0EDFF] flex items-center justify-center hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                title="Restart same puzzle"
                aria-label="Replay"
              >
                <RotateCcw size={34} strokeWidth={2} className="text-[#424242]" />
              </button>

              {/* Undo Button */}
              <button
                onClick={handleUndo}
                disabled={gameStatus !== 'playing' || !hasPlacedPieces}
                className="w-[63.44px] h-[63.44px] rounded-full bg-[#F0EDFF] dark:bg-[#F0EDFF] flex items-center justify-center hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                title="Undo last move"
                aria-label="Undo"
              >
                <Undo size={34} strokeWidth={2} className="text-[#424242]" />
              </button>
            </div>

            {/* Auto Fill Button Mobile (Development Only) */}
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={handleAutoFill}
                disabled={isResetting || isSolved}
                className="w-full h-[46px] rounded-full border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[#F0EDFF] dark:hover:bg-[#35383F] font-urbanist font-bold text-[16px] transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Auto Fill
              </button>
            )}

            {/* New Game / Replay Button Mobile */}
            <button
              onClick={mode === 'normal' ? handleNewGame : handleReplay}
              disabled={isResetting}
              className="w-full h-[46px] rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-urbanist font-bold text-[16px] transition-all duration-200 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isResetting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Loading...</span>
                </>
              ) : (
                mode === 'normal' ? 'New Game' : 'Replay'
              )}
            </button>
          </div>

        </div>
      </div>

      {/* Loading Overlay */}
      {isResetting && (
        <div className="fixed inset-0 bg-white/80 dark:bg-[#181A20]/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-[var(--color-primary)]" size={48} />
            <p className="font-urbanist text-lg font-semibold text-[var(--color-primary)]">
              Loading...
            </p>
          </div>
        </div>
      )}

      {/* Completion Modal */}
      <TangramModal
        isOpen={gameStatus === 'won' || gameStatus === 'lost'}
        time={0}
        mistakes={0}
        hintsUsed={hintsUsed}
        score={score}
        difficulty={puzzle?.difficulty || 'easy'}
        timeRemaining={timeRemaining}
        isTimeUp={gameStatus === 'lost'}
        onPlayAgain={handleRetry}
        onNewPuzzle={handleNewGame}
        onBackToLobby={handleBackToLobby}
      />
    </section>
  )
}
