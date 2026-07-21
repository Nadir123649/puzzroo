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
    selectSquare,
    executeMove,
    handleSelectPromotion,
    undoMove,
    restartGame,
    resignGame,
    reviewHistoryMove,
    toggleSound,
    flipBoard,
    setActiveModal,
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
    <div className="w-full px-3 pb-4">
      {/* Main Game Grid Layout (3-Column Grandmaster Layout) */}
      <div className="w-full max-w-[1380px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* Left Column: Player Cards & Captured Pieces (Cols 1-3 on Desktop) */}
        <div className="lg:col-span-3 flex flex-col gap-3 w-full">
          {/* Top Player Card (Opponent / Black) */}
          <PlayerCard
            name={topPlayerName}
            title={topPlayerTitle}
            rating={topPlayerRating}
            color={topColor}
            difficulty={mode === 'pve' ? difficulty.toUpperCase() : undefined}
            isActive={topIsActive}
            timePlaceholder={isAiThinking ? 'Thinking...' : topTimeFormatted}
            lowTime={topColor === 'white' ? isLowTimeWhite : isLowTimeBlack}
          />

          <CapturedPieces
            pieces={capturedPieces.byWhite}
            color="black"
            pieceTheme={activePieceTheme}
            customWhiteColor={initialCustomWhite}
            customBlackColor={initialCustomBlack}
            scoreAdvantage={capturedPieces.whiteScore > capturedPieces.blackScore ? capturedPieces.whiteScore - capturedPieces.blackScore : 0}
            className="flex flex-col w-full"
          />

          <CapturedPieces
            pieces={capturedPieces.byBlack}
            color="white"
            pieceTheme={activePieceTheme}
            customWhiteColor={initialCustomWhite}
            customBlackColor={initialCustomBlack}
            scoreAdvantage={capturedPieces.blackScore > capturedPieces.whiteScore ? capturedPieces.blackScore - capturedPieces.whiteScore : 0}
            className="flex flex-col w-full"
          />

          {/* Bottom Player Card (You / White) */}
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

        {/* Middle Column: Interactive Chess Board (Cols 4-9 on Desktop) */}
        <div className="lg:col-span-6 flex flex-col items-center w-full">
          <div className="w-full max-w-[560px] flex flex-col items-center gap-2">
            
            {/* The 8x8 Interactive Chess Board */}
            <div ref={boardWrapperRef} className="w-full flex justify-center py-1 relative">
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
                disabled={gameStatus !== 'playing' || isAiThinking}
                onSquareSelect={selectSquare}
                onMoveExecute={executeMove}
              />

              {/* Check Notification */}
              {showCheckNotif && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-red-600 text-white px-5 py-2 rounded-full font-urbanist font-extrabold text-sm shadow-lg z-30 animate-fadeIn">
                  CHECK!
                </div>
              )}

              {/* Thinking Overlay Badge */}
              {isAiThinking && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-[#6949FF] text-white px-4 py-1.5 rounded-full font-urbanist font-extrabold text-xs shadow-lg animate-pulse z-30">
                  Computer Thinking...
                </div>
              )}

              {/* Promotion Selector */}
              {activeModal === 'promotion' && pendingPromotion && (
                <PromotionSelector
                  toSquare={pendingPromotion.to}
                  color={turn}
                  pieceTheme={activePieceTheme}
                  customWhiteColor={initialCustomWhite}
                  customBlackColor={initialCustomBlack}
                  isMounted={true}
                  onSelect={handleSelectPromotion}
                  boardRef={boardWrapperRef}
                />
              )}
            </div>

            {/* Active Turn Indicator Banner (AFTER THE BOARD) */}
            <div className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#F0EDFF] dark:bg-[#1F222A] border border-[#E0D9FF] dark:border-[#35383F] shadow-sm">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${turn === 'white' ? 'bg-white shadow border border-gray-400' : 'bg-gray-900 border border-gray-600'}`} />
                <span className="font-urbanist font-extrabold text-xs sm:text-sm text-[#212121] dark:text-[#FAFAFA]">
                  {mode === 'pve'
                    ? (side === turn ? `Your Turn (${turn.toUpperCase()})` : `Computer's Turn (${turn.toUpperCase()})`)
                    : `${turn.toUpperCase()} to Move`}
                </span>
              </div>
              {isAiThinking && (
                <span className="text-xs font-urbanist font-bold text-[#6949FF] dark:text-purple-400 animate-pulse">
                  Computer Thinking...
                </span>
              )}
            </div>

          </div>
        </div>

        {/* Right Column: Move History & Controls (Cols 10-12 on Desktop) */}
        <div className="lg:col-span-3 flex flex-col gap-3 w-full">
          {/* Move History Panel */}
          <MoveHistory
            moves={moveHistory}
            reviewIndex={reviewIndex}
            onReviewMove={reviewHistoryMove}
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
        onRestartConfirm={restartGame}
        onResignConfirm={handleResignConfirm}
        onPlayAgain={restartGame}
        onClose={() => setActiveModal('none')}
      />
    </div>
  )
}

export default ChessGame
