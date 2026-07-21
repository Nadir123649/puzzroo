'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Play, Sparkles, User, Bot, Users } from 'lucide-react'
import { BoardThemeId } from '@/utils/chess'
import { PieceThemeId } from '../SvgChessPiece'
import { DifficultySelector, DifficultyLevel } from './DifficultySelector'
import { BoardThemeSelector } from './BoardThemeSelector'
import { PieceThemeSelector } from './PieceThemeSelector'
import { BoardPreview } from './BoardPreview'
import { GameLoader } from '@/components/ui/GameLoader'
import { cn } from '@/lib/utils'

export type GameMode = 'pve' | 'pvp'
export type PlayerSide = 'white' | 'black'

export function ChessSetup() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [mode, setMode] = useState<GameMode>('pve')
  const [side, setSide] = useState<PlayerSide>('white')
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('easy')
  const [boardTheme, setBoardTheme] = useState<BoardThemeId>('classic')
  const [pieceTheme, setPieceTheme] = useState<PieceThemeId>('classic')
  const [customWhiteColor, setCustomWhiteColor] = useState('#FFFFFF')
  const [customBlackColor, setCustomBlackColor] = useState('#010101')

  const [isNavigating, setIsNavigating] = useState(false)

  // Initialize from searchParams if provided
  useEffect(() => {
    const m = searchParams?.get('mode') as GameMode
    if (m && ['pve', 'pvp'].includes(m)) setMode(m)

    const s = searchParams?.get('side') as PlayerSide
    if (s && ['white', 'black'].includes(s)) setSide(s)

    const diff = searchParams?.get('difficulty') as DifficultyLevel
    if (diff && ['easy', 'medium', 'hard'].includes(diff)) {
      setDifficulty(diff)
    }
    const theme = searchParams?.get('theme') as BoardThemeId
    if (theme && ['classic', 'green', 'brown', 'dark'].includes(theme)) {
      setBoardTheme(theme)
    }
  }, [searchParams])

  const handleStartGame = async () => {
    setIsNavigating(true)
    await new Promise((resolve) => setTimeout(resolve, 800))

    // Save preferences in sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('chess_mode', mode)
      sessionStorage.setItem('chess_side', side)
      sessionStorage.setItem('chess_difficulty', difficulty)
      sessionStorage.setItem('chess_board_theme', boardTheme)
      sessionStorage.setItem('chess_piece_theme', pieceTheme)
      sessionStorage.setItem('chess_custom_white', customWhiteColor)
      sessionStorage.setItem('chess_custom_black', customBlackColor)
      // Clear old FEN match on new match setup
      sessionStorage.removeItem('puzzroo_chess_fen')
      localStorage.removeItem('puzzroo_chess_fen')
    }

    const targetUrl = `/chess?mode=${mode}&side=${side}&difficulty=${difficulty}&theme=${boardTheme}&pieceTheme=${pieceTheme}`
    router.push(targetUrl)
  }

  const handleBackToLobby = () => {
    router.push('/game/chess')
  }

  return (
    <>
      <div className="w-full bg-white dark:bg-[#181A20] transition-colors duration-300 py-6 md:py-10 px-4 sm:px-6">
        <div className="w-full max-w-[1380px] mx-auto flex flex-col gap-6 md:gap-8">
          
          {/* Header Bar with Back Button */}
          <div className="w-full flex items-center justify-between">
            <button
              onClick={handleBackToLobby}
              className="hidden sm:flex w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-[#6949FF] bg-white dark:bg-[#181A20] items-center justify-center p-2 hover:bg-[#F0EDFF] dark:hover:bg-[#35383F] transition-all duration-200 active:scale-95 shadow-sm"
              aria-label="Back to Lobby"
            >
              <ArrowLeft size={20} className="text-[#6949FF]" strokeWidth={2.5} />
            </button>

            <div className="flex items-center gap-2 bg-[#F0EDFF] dark:bg-[#1F222A] px-3.5 py-1.5 rounded-full border border-[#E0D9FF] dark:border-[#35383F]">
              <Sparkles size={16} className="text-[#6949FF]" />
              <span className="font-urbanist font-extrabold text-xs sm:text-sm text-[#6949FF]">
                Pre-Game Customization
              </span>
            </div>
          </div>

          {/* Setup Title Section */}
          <div className="flex flex-col items-center text-center gap-2">
            <h1 className="font-urbanist font-bold text-2xl sm:text-4xl md:text-5xl text-[#212121] dark:text-[#FAFAFA]">
              CHESS MATCH SETUP
            </h1>
            <p className="font-urbanist text-xs sm:text-base text-[#757575] dark:text-[#BDBDBD] max-w-[600px]">
              Customize your difficulty, board style, and piece colors before heading onto the battlefield!
            </p>
          </div>

          {/* 2-Column Responsive Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left Column: Customization Controls (Cols 1-7) */}
            <div className="lg:col-span-7 flex flex-col gap-6 bg-[#F0EDFF]/50 dark:bg-[#1F222A]/70 p-4 sm:p-6 rounded-2xl border border-[#E0D9FF] dark:border-[#35383F] shadow-sm">
              
              {/* Game Mode Selection */}
              <div className="flex flex-col gap-2.5 w-full">
                <label className="font-urbanist font-bold text-sm sm:text-base text-[#212121] dark:text-[#FAFAFA]">
                  Game Mode
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMode('pve')}
                    className={cn(
                      'flex items-center justify-center gap-2.5 p-3 rounded-xl border-2 font-urbanist font-extrabold text-sm transition-all duration-200 cursor-pointer active:scale-95 bg-white dark:bg-[#1F222A]',
                      mode === 'pve'
                        ? 'border-[#6949FF] text-[#6949FF] dark:text-purple-300 bg-[#6949FF]/5 dark:bg-[#6949FF]/15 ring-2 ring-[#6949FF]/30 shadow-sm'
                        : 'border-gray-200 dark:border-[#35383F] text-[#757575] dark:text-[#BDBDBD] hover:border-gray-300'
                    )}
                  >
                    <Bot size={18} />
                    <span>Vs Computer AI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMode('pvp')}
                    className={cn(
                      'flex items-center justify-center gap-2.5 p-3 rounded-xl border-2 font-urbanist font-extrabold text-sm transition-all duration-200 cursor-pointer active:scale-95 bg-white dark:bg-[#1F222A]',
                      mode === 'pvp'
                        ? 'border-[#6949FF] text-[#6949FF] dark:text-purple-300 bg-[#6949FF]/5 dark:bg-[#6949FF]/15 ring-2 ring-[#6949FF]/30 shadow-sm'
                        : 'border-gray-200 dark:border-[#35383F] text-[#757575] dark:text-[#BDBDBD] hover:border-gray-300'
                    )}
                  >
                    <Users size={18} />
                    <span>Pass & Play (2P)</span>
                  </button>
                </div>
              </div>

              {/* Player Side Choice (White or Black) */}
              {mode === 'pve' && (
                <div className="flex flex-col gap-2.5 w-full">
                  <label className="font-urbanist font-bold text-sm sm:text-base text-[#212121] dark:text-[#FAFAFA]">
                    Play As
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setSide('white')}
                      className={cn(
                        'flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-urbanist font-extrabold text-sm transition-all duration-200 cursor-pointer active:scale-95 bg-white dark:bg-[#1F222A]',
                        side === 'white'
                          ? 'border-[#6949FF] text-[#6949FF] dark:text-purple-300 bg-[#6949FF]/5 dark:bg-[#6949FF]/15 ring-2 ring-[#6949FF]/30 shadow-sm'
                          : 'border-gray-200 dark:border-[#35383F] text-[#757575] dark:text-[#BDBDBD]'
                      )}
                    >
                      <User size={18} />
                      <span>White (First Move)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSide('black')}
                      className={cn(
                        'flex items-center justify-center gap-2 p-3 rounded-xl border-2 font-urbanist font-extrabold text-sm transition-all duration-200 cursor-pointer active:scale-95 bg-white dark:bg-[#1F222A]',
                        side === 'black'
                          ? 'border-[#6949FF] text-[#6949FF] dark:text-purple-300 bg-[#6949FF]/5 dark:bg-[#6949FF]/15 ring-2 ring-[#6949FF]/30 shadow-sm'
                          : 'border-gray-200 dark:border-[#35383F] text-[#757575] dark:text-[#BDBDBD]'
                      )}
                    >
                      <Bot size={18} />
                      <span>Black (AI Moves 1st)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Difficulty Selection */}
              {mode === 'pve' && (
                <DifficultySelector selected={difficulty} onSelect={setDifficulty} />
              )}

              {/* Board Theme Selection */}
              <BoardThemeSelector selected={boardTheme} onSelect={setBoardTheme} />

              {/* Piece Theme & Color Selection */}
              <PieceThemeSelector
                selected={pieceTheme}
                onSelect={setPieceTheme}
                customWhiteColor={customWhiteColor}
                onCustomWhiteChange={setCustomWhiteColor}
                customBlackColor={customBlackColor}
                onCustomBlackChange={setCustomBlackColor}
              />
            </div>

            {/* Right Column: Live Board Preview (Cols 8-12) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <BoardPreview
                boardThemeId={boardTheme}
                pieceThemeId={pieceTheme}
                customWhiteColor={customWhiteColor}
                customBlackColor={customBlackColor}
              />

              {/* Start Game Button */}
              <div className="w-full flex justify-center mt-1">
                <button
                  onClick={handleStartGame}
                  disabled={isNavigating}
                  className="w-full max-w-[260px] sm:max-w-[300px] h-11 sm:h-12 rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white font-urbanist font-bold text-sm sm:text-base transition-all duration-200 active:scale-95 shadow-lg shadow-[#6949FF]/25 flex items-center justify-center gap-2.5 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <span>Start Match</span>
                  <Play size={18} className="fill-white" />
                </button>
              </div>
            </div>

          </div>

        </div>
      </div>

      <GameLoader isOpen={isNavigating} text="Preparing Chess board..." />
    </>
  )
}

export default ChessSetup
