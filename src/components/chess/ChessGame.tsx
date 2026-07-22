'use client'

import React, { useRef, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getBoardTheme, BoardThemeId } from '@/utils/chess'
import { PieceThemeId, PIECE_THEMES } from '@/components/chess/SvgChessPiece'
import { ChessBoard } from '@/components/chess/ChessBoard'
import { PlayerCard } from '@/components/chess/PlayerCard'
import { MoveHistory } from '@/components/chess/MoveHistory'
import { CapturedPieces } from '@/components/chess/CapturedPieces'
import { GameControls } from '@/components/chess/GameControls'
import { ChessModal } from '@/components/chess/ChessModal'
import { PromotionSelector } from '@/components/chess/PromotionSelector'
import { useChess, formatTime } from '@/hooks/useChess'

interface ChessGameProps {
  initialDifficulty?: string
  initialBoardTheme?: BoardThemeId
  initialPieceTheme?: PieceThemeId
  initialCustomWhite?: string
  initialCustomBlack?: string
}

export function ChessGame({
  initialBoardTheme = 'classic',
  initialPieceTheme = 'classic',
  initialCustomWhite = '#FFFFFF',
  initialCustomBlack = '#010101',
}: ChessGameProps) {
  const {
    boardGrid,
    turn,
    gameStatus,
    drawReason,
    winner,
    difficulty,
    mode,
    side,
    boardThemeId,
    pieceThemeId,
    selectedSquare,
    legalMoves,
    captureMoves,
    lastMove,
    inCheck,
    kingInCheckSquare,
    moveHistory,
    reviewIndex,
    capturedPieces,
    isFlipped,
    isMuted,
    isAiThinking,
    activeModal,
    pendingPromotion,
    whiteTime,
    blackTime,
    isPracticeMode,
    setIsPracticeMode,
    hintMove,
    selectSquare,
    executeMove,
    handleSelectPromotion,
    cancelPromotion,
    undoMove,
    restartGame,
    resignGame,
    reviewHistoryMove,
    toggleSound,
    flipBoard,
    setActiveModal,
    getHint,
  } = useChess()

  const router = useRouter()
  const boardWrapperRef = useRef<HTMLDivElement>(null)
  const [showCheckNotif, setShowCheckNotif] = useState(false)

  const handleResignConfirm = () => {
    resignGame()
    router.push('/game/chess')
  }

  useEffect(() => {
    if (inCheck) {
      setShowCheckNotif(true)
      const t = setTimeout(() => setShowCheckNotif(false), 1800)
      return () => clearTimeout(t)
    } else {
      setShowCheckNotif(false)
    }
  }, [inCheck])

  const activeTheme = getBoardTheme(boardThemeId || initialBoardTheme)
  const activePieceTheme = PIECE_THEMES[pieceThemeId || initialPieceTheme] || PIECE_THEMES.classic

  const isPlayer1Turn = turn === 'white'
  const isPlayer2Turn = turn === 'black'
  const isLowTimeWhite = whiteTime > 0 && whiteTime <= 30
  const isLowTimeBlack = blackTime > 0 && blackTime <= 30

  // Top / Bottom Player Card Labels & Timers
  const topPlayerName = mode === 'pve' ? `Computer (${difficulty.toUpperCase()})` : 'Player 2 (Black)'
  const topPlayerTitle = mode === 'pve' ? 'AI BOT' : 'P2'
  const topPlayerRating = mode === 'pve' ? (difficulty === 'hard' ? 2200 : difficulty === 'medium' ? 1600 : 1000) : 1500
  const topColor = isFlipped ? 'white' : 'black'
  const topIsActive = isFlipped ? isPlayer1Turn : isPlayer2Turn
  const topTimeFormatted = formatTime(topColor === 'white' ? whiteTime : blackTime)

  const bottomPlayerName = mode === 'pve' ? `You (${side.toUpperCase()})` : 'Player 1 (White)'
  const bottomPlayerTitle = 'YOU'
  const bottomPlayerRating = 1500
  const bottomColor = isFlipped ? 'black' : 'white'
  const bottomIsActive = isFlipped ? isPlayer2Turn : isPlayer1Turn
  const bottomTimeFormatted = formatTime(bottomColor === 'white' ? whiteTime : blackTime)

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 pb-6">
      {/* Main Game Flex Layout (Optimized side widths, centered board) */}
      <div className="w-full max-w-[1380px] mx-auto flex flex-col lg:flex-row gap-5 xl:gap-6 justify-center items-center lg:items-stretch">
        
        {/* Left Column: Player Cards & Captured Pieces */}
        <div className="flex-grow flex-shrink basis-0 min-w-[280px] flex flex-col gap-4 sm:gap-5 w-full">
          {/* Top Player Card (Opponent / Black) */}
          <div className="flex flex-col gap-2">
            <PlayerCard
              name={topPlayerName}
              title={topPlayerTitle}
              rating={topPlayerRating}
              color={topColor}
              difficulty={mode === 'pve' ? difficulty.toUpperCase() : undefined}
              isActive={topIsActive}
              timePlaceholder={topTimeFormatted}
              lowTime={topColor === 'white' ? isLowTimeWhite : isLowTimeBlack}
            />

            <CapturedPieces
              pieces={topColor === 'black' ? capturedPieces.byWhite : capturedPieces.byBlack}
              color={topColor === 'black' ? 'black' : 'white'}
              pieceTheme={activePieceTheme}
              customWhiteColor={initialCustomWhite}
              customBlackColor={initialCustomBlack}
              scoreAdvantage={
                topColor === 'black'
                  ? (capturedPieces.whiteScore > capturedPieces.blackScore ? capturedPieces.whiteScore - capturedPieces.blackScore : 0)
                  : (capturedPieces.blackScore > capturedPieces.whiteScore ? capturedPieces.blackScore - capturedPieces.whiteScore : 0)
              }
              className="flex flex-col w-full min-h-[75px]"
            />
          </div>

          {/* Bottom Player Card (You / White) */}
          <div className="flex flex-col gap-2">
            <CapturedPieces
              pieces={bottomColor === 'white' ? capturedPieces.byBlack : capturedPieces.byWhite}
              color={bottomColor === 'white' ? 'white' : 'black'}
              pieceTheme={activePieceTheme}
              customWhiteColor={initialCustomWhite}
              customBlackColor={initialCustomBlack}
              scoreAdvantage={
                bottomColor === 'white'
                  ? (capturedPieces.blackScore > capturedPieces.whiteScore ? capturedPieces.blackScore - capturedPieces.whiteScore : 0)
                  : (capturedPieces.whiteScore > capturedPieces.blackScore ? capturedPieces.whiteScore - capturedPieces.blackScore : 0)
              }
              className="flex flex-col w-full min-h-[75px]"
            />

            <PlayerCard
              name={bottomPlayerName}
              title={bottomPlayerTitle}
              rating={bottomPlayerRating}
              color={bottomColor}
              isActive={bottomIsActive}
              timePlaceholder={bottomTimeFormatted}
              lowTime={bottomColor === 'white' ? isLowTimeWhite : isLowTimeBlack}
            />
          </div>
        </div>

        {/* Middle Column: Interactive Chess Board */}
        <div className="w-full max-w-[500px] lg:flex-shrink-0 flex flex-col items-center">
          <div className="w-full flex flex-col items-center gap-2">
            
            {/* The 8x8 Interactive Chess Board */}
            <div ref={boardWrapperRef} className="w-full flex justify-center relative">
              <ChessBoard
                boardState={boardGrid}
                theme={activeTheme}
                pieceTheme={activePieceTheme}
                customWhiteColor={initialCustomWhite}
                customBlackColor={initialCustomBlack}
                isFlipped={isFlipped}
                selectedSquare={selectedSquare}
                legalMoves={legalMoves}
                captureMoves={captureMoves}
                lastMove={lastMove}
                kingInCheckSquare={kingInCheckSquare}
                hintMove={hintMove}
                disabled={gameStatus !== 'playing' || isAiThinking}
                onSquareSelect={selectSquare}
                onMoveExecute={executeMove}
              />

              {/* Promotion Selector */}
              {activeModal === 'promotion' && pendingPromotion && (
                <PromotionSelector
                  toSquare={pendingPromotion.to}
                  color={turn}
                  pieceTheme={activePieceTheme}
                  customWhiteColor={initialCustomWhite}
                  customBlackColor={initialCustomBlack}
                  isMounted={true}
                  isFlipped={isFlipped}
                  onSelect={handleSelectPromotion}
                  onCancel={cancelPromotion}
                />
              )}
            </div>

          </div>
        </div>

        {/* Right Column: Match Notation & Controls */}
        <div className="flex-grow flex-shrink basis-0 min-w-[280px] flex flex-col gap-4 sm:gap-5 w-full">
          {/* Move History Panel */}
          <MoveHistory
            moves={moveHistory}
            reviewIndex={reviewIndex}
            onReviewMove={reviewHistoryMove}
            mode={mode}
          />

          {/* Gameplay Actions Panel */}
          <GameControls
            onUndo={undoMove}
            onFlipBoard={flipBoard}
            onRestart={() => setActiveModal('restart_confirm')}
            onResign={() => setActiveModal('resign_confirm')}
            onToggleSound={toggleSound}
            isFlipped={isFlipped}
            isMuted={isMuted}
            isPracticeMode={isPracticeMode}
            onGetHint={getHint}
            disabled={gameStatus !== 'playing' || isAiThinking}
          />
        </div>

      </div>

      {/* Game Modals (Promotion, Win, Lose, Draw, Confirmations) */}
       <ChessModal
        isOpen={activeModal !== 'none' && activeModal !== 'promotion'}
        modalType={activeModal}
        winner={winner}
        drawReason={drawReason}
        difficulty={difficulty}
        totalMoves={moveHistory.length}
        gameStatus={gameStatus}
        mode={mode}
        onRestartConfirm={restartGame}
        onResignConfirm={handleResignConfirm}
        onPlayAgain={restartGame}
        onClose={() => setActiveModal('none')}
      />
    </div>
  )
}

export default ChessGame
