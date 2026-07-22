'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, ShieldAlert, RefreshCw, AlertCircle, X } from 'lucide-react'
import { PieceColor } from '@/utils/chess'
import { cn } from '@/lib/utils'

export type ModalType = 'none' | 'promotion' | 'win' | 'lose' | 'draw' | 'restart_confirm' | 'resign_confirm'

interface ChessModalProps {
  isOpen: boolean
  modalType: ModalType
  winner?: PieceColor | null
  drawReason?: string | null
  difficulty?: string
  totalMoves?: number
  gameStatus?: string
  mode?: string
  onRestartConfirm?: () => void
  onResignConfirm?: () => void
  onPlayAgain?: () => void
  onClose?: () => void
}

export function ChessModal({
  isOpen,
  modalType,
  winner,
  drawReason,
  difficulty = 'easy',
  totalMoves = 0,
  gameStatus = 'playing',
  mode = 'pve',
  onRestartConfirm,
  onResignConfirm,
  onPlayAgain,
  onClose,
}: ChessModalProps) {
  const router = useRouter()

  const isConfirm = modalType === 'restart_confirm' || modalType === 'resign_confirm'

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  if (!isOpen || modalType === 'none') return null

  const handleBackToLobby = () => {
    router.push('/game/chess')
  }

  const handleNewGameSetup = () => {
    router.push('/chess/setup')
  }

  // Get localized detailed game end message
  const getSubtext = () => {
    const isTimeout = gameStatus === 'timeout'
    if (isTimeout) {
      if (mode === 'pve') {
        return winner === 'white' ? 'You won by timeout' : 'You lost by timeout'
      } else {
        return winner === 'white' ? 'Player 1 won by timeout' : 'Player 2 won by timeout'
      }
    } else {
      if (mode === 'pve') {
        return winner === 'white' ? 'You won by checkmate' : 'You lost by checkmate'
      } else {
        return winner === 'white' ? 'Player 1 won by checkmate' : 'Player 2 won by checkmate'
      }
    }
  }

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-all duration-300"
      onClick={() => onClose?.()}
    >
      
      {/* Win Modal */}
      {modalType === 'win' && (
        <div
          className="w-full max-w-md bg-gradient-to-b from-white to-[#F4F2FF] dark:from-[#1F222A] dark:to-[#171921] rounded-[32px] p-8 border border-green-500/20 shadow-2xl flex flex-col items-center text-center gap-6 animate-scaleIn relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={() => onClose?.()}
            className="absolute top-5 right-5 text-[#757575] hover:text-[#212121] dark:text-[#BDBDBD] dark:hover:text-white p-1.5 rounded-full hover:bg-gray-155 dark:hover:bg-[#262A34] transition-all duration-200 z-50 cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          {/* Decorative Sparkle Gradient */}
          <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-green-400/10 blur-3xl pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-[#6949FF]/10 blur-3xl pointer-events-none" />

          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-green-500 to-emerald-400 text-white flex items-center justify-center shadow-lg shadow-green-500/20 animate-pulse">
            <Trophy size={42} />
          </div>

          <div className="flex flex-col gap-1.5 z-10">
            <h2 className="font-urbanist font-extrabold text-3xl sm:text-4xl text-[#212121] dark:text-white tracking-tight leading-none bg-gradient-to-r from-[#212121] via-[#6949FF] to-[#212121] dark:from-white dark:via-purple-400 dark:to-white bg-clip-text text-transparent">
              VICTORY!
            </h2>
            <p className="font-urbanist font-bold text-sm sm:text-base text-green-600 dark:text-green-400">
              {getSubtext()}
            </p>
          </div>

          <div className="flex items-center gap-3 justify-center z-10">
            <div className="bg-[#6949FF]/5 dark:bg-[#262A34] rounded-2xl px-4 py-2 flex flex-col items-center min-w-[80px] border border-[#6949FF]/10">
              <span className="text-[10px] font-urbanist font-semibold text-[#757575] dark:text-[#BDBDBD] uppercase tracking-wider">Moves</span>
              <span className="font-urbanist font-extrabold text-base text-[#6949FF] dark:text-purple-300">{totalMoves}</span>
            </div>
            {mode === 'pve' && (
              <div className="bg-[#6949FF]/5 dark:bg-[#262A34] rounded-2xl px-4 py-2 flex flex-col items-center min-w-[90px] border border-[#6949FF]/10">
                <span className="text-[10px] font-urbanist font-semibold text-[#757575] dark:text-[#BDBDBD] uppercase tracking-wider">Difficulty</span>
                <span className="text-xs font-extrabold text-[#6949FF] dark:text-purple-300 uppercase tracking-wide mt-0.5">{difficulty}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 w-full mt-2 z-10">
            <button
              onClick={onPlayAgain}
              className="w-full h-12 rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white font-urbanist font-bold text-base transition-all duration-200 active:scale-95 shadow-lg shadow-[#6949FF]/20"
            >
              Play Again
            </button>
            <button
              onClick={handleNewGameSetup}
              className="w-full h-11 rounded-full border-2 border-[#E0D9FF] dark:border-[#35383F] text-[#6949FF] dark:text-white bg-white dark:bg-[#262A34] hover:bg-[#F0EDFF] dark:hover:bg-[#35383F] font-urbanist font-bold text-sm transition-all duration-200 active:scale-95"
            >
              New Game Setup
            </button>
            <button
              onClick={handleBackToLobby}
              className="text-xs font-urbanist font-bold text-[#757575] dark:text-[#BDBDBD] hover:text-[#6949FF] hover:underline pt-1 transition-colors"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      )}

      {/* Lose Modal */}
      {modalType === 'lose' && (
        <div
          className="w-full max-w-md bg-gradient-to-b from-white to-[#FFF2F2] dark:from-[#1F222A] dark:to-[#1C181E] rounded-[32px] p-8 border border-red-500/20 shadow-2xl flex flex-col items-center text-center gap-6 animate-scaleIn relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={() => onClose?.()}
            className="absolute top-5 right-5 text-[#757575] hover:text-[#212121] dark:text-[#BDBDBD] dark:hover:text-white p-1.5 rounded-full hover:bg-gray-155 dark:hover:bg-[#262A34] transition-all duration-200 z-50 cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          {/* Decorative Sparkle Gradient */}
          <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-red-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-[#6949FF]/10 blur-3xl pointer-events-none" />

          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-red-500 to-rose-400 text-white flex items-center justify-center shadow-lg shadow-red-500/20">
            <ShieldAlert size={42} />
          </div>

          <div className="flex flex-col gap-1.5 z-10">
            <h2 className="font-urbanist font-extrabold text-3xl sm:text-4xl text-[#212121] dark:text-white tracking-tight leading-none">
              DEFEAT
            </h2>
            <p className="font-urbanist font-bold text-sm sm:text-base text-red-600 dark:text-red-400">
              {getSubtext()}
            </p>
          </div>

          <div className="flex items-center gap-3 justify-center z-10">
            <div className="bg-[#6949FF]/5 dark:bg-[#262A34] rounded-2xl px-4 py-2 flex flex-col items-center min-w-[80px] border border-[#6949FF]/10">
              <span className="text-[10px] font-urbanist font-semibold text-[#757575] dark:text-[#BDBDBD] uppercase tracking-wider">Moves</span>
              <span className="font-urbanist font-extrabold text-base text-[#6949FF] dark:text-purple-300">{totalMoves}</span>
            </div>
            {mode === 'pve' && (
              <div className="bg-[#6949FF]/5 dark:bg-[#262A34] rounded-2xl px-4 py-2 flex flex-col items-center min-w-[90px] border border-[#6949FF]/10">
                <span className="text-[10px] font-urbanist font-semibold text-[#757575] dark:text-[#BDBDBD] uppercase tracking-wider">Difficulty</span>
                <span className="text-xs font-extrabold text-[#6949FF] dark:text-purple-300 uppercase tracking-wide mt-0.5">{difficulty}</span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 w-full mt-2 z-10">
            <button
              onClick={onPlayAgain}
              className="w-full h-12 rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white font-urbanist font-bold text-base transition-all duration-200 active:scale-95 shadow-lg shadow-[#6949FF]/20"
            >
              Play Again
            </button>
            <button
              onClick={handleNewGameSetup}
              className="w-full h-11 rounded-full border-2 border-[#E0D9FF] dark:border-[#35383F] text-[#6949FF] dark:text-white bg-white dark:bg-[#262A34] hover:bg-[#F0EDFF] dark:hover:bg-[#35383F] font-urbanist font-bold text-sm transition-all duration-200 active:scale-95"
            >
              New Game Setup
            </button>
            <button
              onClick={handleBackToLobby}
              className="text-xs font-urbanist font-bold text-[#757575] dark:text-[#BDBDBD] hover:text-[#6949FF] hover:underline pt-1 transition-colors"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      )}

      {/* Draw Modal */}
      {modalType === 'draw' && (
        <div
          className="w-full max-w-md bg-gradient-to-b from-white to-[#F0F5FF] dark:from-[#1F222A] dark:to-[#171B26] rounded-[32px] p-8 border border-blue-500/20 shadow-2xl flex flex-col items-center text-center gap-6 animate-scaleIn relative overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={() => onClose?.()}
            className="absolute top-5 right-5 text-[#757575] hover:text-[#212121] dark:text-[#BDBDBD] dark:hover:text-white p-1.5 rounded-full hover:bg-gray-155 dark:hover:bg-[#262A34] transition-all duration-200 z-50 cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          {/* Decorative Sparkle Gradient */}
          <div className="absolute -top-24 -left-24 w-48 h-48 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />

          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
            <RefreshCw size={36} className="animate-spin-slow" />
          </div>

          <div className="flex flex-col gap-1.5 z-10">
            <h2 className="font-urbanist font-extrabold text-3xl sm:text-4xl text-[#212121] dark:text-white tracking-tight leading-none">
              DRAW
            </h2>
            <p className="font-urbanist font-bold text-sm sm:text-base text-blue-600 dark:text-blue-400 capitalize">
              {drawReason || 'Stalemate'}
            </p>
          </div>

          <div className="flex items-center gap-3 justify-center z-10">
            <div className="bg-[#6949FF]/5 dark:bg-[#262A34] rounded-2xl px-4 py-2 flex flex-col items-center min-w-[80px] border border-[#6949FF]/10">
              <span className="text-[10px] font-urbanist font-semibold text-[#757575] dark:text-[#BDBDBD] uppercase tracking-wider">Moves</span>
              <span className="font-urbanist font-extrabold text-base text-[#6949FF] dark:text-purple-300">{totalMoves}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full mt-2 z-10">
            <button
              onClick={onPlayAgain}
              className="w-full h-12 rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white font-urbanist font-bold text-base transition-all duration-200 active:scale-95 shadow-lg shadow-[#6949FF]/20"
            >
              Play Again
            </button>
            <button
              onClick={handleBackToLobby}
              className="w-full h-11 rounded-full border-2 border-gray-300 dark:border-gray-700 text-[#757575] dark:text-white bg-white dark:bg-[#262A34] hover:bg-gray-50 dark:hover:bg-[#35383F] font-urbanist font-bold text-sm transition-all duration-200 active:scale-95"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      )}

      {/* Restart Confirmation */}
      {modalType === 'restart_confirm' && (
        <div 
          className="w-full max-w-sm bg-white dark:bg-[#1F222A] rounded-3xl p-6 border border-gray-200 dark:border-gray-700 shadow-2xl flex flex-col items-center text-center gap-4 animate-scaleIn relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={() => onClose?.()}
            className="absolute top-4 right-4 text-[#757575] hover:text-[#212121] dark:text-[#BDBDBD] dark:hover:text-white p-1.5 rounded-full hover:bg-gray-155 dark:hover:bg-[#262A34] transition-all duration-200 z-50 cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>

          <AlertCircle size={40} className="text-yellow-500" />
          <h3 className="font-urbanist font-extrabold text-lg text-[#212121] dark:text-white">
            Restart Game?
          </h3>
          <p className="text-xs font-urbanist text-[#757575] dark:text-[#BDBDBD]">
            This will reset the current match state back to turn 1.
          </p>
          <div className="grid grid-cols-2 gap-3 w-full mt-2">
            <button
              onClick={onRestartConfirm}
              className="h-10 rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white font-urbanist font-bold text-sm transition-all active:scale-95 shadow-md shadow-[#6949FF]/10"
            >
              Restart
            </button>
            <button
              onClick={onClose}
              className="h-10 rounded-full border border-gray-300 dark:border-gray-700 text-[#757575] dark:text-[#BDBDBD] font-urbanist font-bold text-sm transition-all active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Resign Confirmation */}
      {modalType === 'resign_confirm' && (
        <div 
          className="w-full max-w-sm bg-white dark:bg-[#1F222A] rounded-3xl p-6 border border-red-200 dark:border-red-900/50 shadow-2xl flex flex-col items-center text-center gap-4 animate-scaleIn relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={() => onClose?.()}
            className="absolute top-4 right-4 text-[#757575] hover:text-[#212121] dark:text-[#BDBDBD] dark:hover:text-white p-1.5 rounded-full hover:bg-gray-155 dark:hover:bg-[#262A34] transition-all duration-200 z-50 cursor-pointer"
            aria-label="Close"
          >
            <X size={16} />
          </button>

          <AlertCircle size={40} className="text-red-500" />
          <h3 className="font-urbanist font-extrabold text-lg text-[#212121] dark:text-white">
            Resign Match?
          </h3>
          <p className="text-xs font-urbanist text-[#757575] dark:text-[#BDBDBD]">
            Are you sure you want to forfeit this match to your opponent?
          </p>
          <div className="grid grid-cols-2 gap-3 w-full mt-2">
            <button
              onClick={onResignConfirm}
              className="h-10 rounded-full bg-red-600 hover:bg-red-700 text-white font-urbanist font-bold text-sm transition-all active:scale-95"
            >
              Resign
            </button>
            <button
              onClick={onClose}
              className="h-10 rounded-full border border-gray-300 dark:border-gray-700 text-[#757575] dark:text-[#BDBDBD] font-urbanist font-bold text-sm transition-all active:scale-95"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

export default ChessModal
