'use client'

import React, { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy, ShieldAlert, RefreshCw, AlertCircle } from 'lucide-react'
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
  onRestartConfirm,
  onResignConfirm,
  onPlayAgain,
  onClose,
}: ChessModalProps) {
  const router = useRouter()

  const isConfirm = modalType === 'restart_confirm' || modalType === 'resign_confirm'

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isConfirm) {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isConfirm, onClose])

  if (!isOpen || modalType === 'none') return null

  const handleBackToLobby = () => {
    router.push('/game/chess')
  }

  const handleNewGameSetup = () => {
    router.push('/chess/setup')
  }

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      onClick={isConfirm ? () => onClose?.() : undefined}
    >
      
      {/* Win Modal */}
      {modalType === 'win' && (
        <div
          className="w-full max-w-md bg-white dark:bg-[#1F222A] rounded-3xl p-6 sm:p-8 border border-green-500/30 shadow-2xl flex flex-col items-center text-center gap-5 animate-fadeIn scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 flex items-center justify-center animate-bounce-in">
            <Trophy size={36} />
          </div>

          <div className="flex flex-col gap-1">
            <h2 className="font-urbanist font-extrabold text-2xl sm:text-3xl text-[#212121] dark:text-white">
              {winner ? `${winner.toUpperCase()} WINS!` : 'MATCH WON!'}
            </h2>
            <p className="font-urbanist text-xs sm:text-sm text-[#757575] dark:text-[#BDBDBD]">
              {winner ? `${winner === 'white' ? 'White' : 'Black'} wins by checkmate` : 'Victory!'}
            </p>
          </div>

          <div className="flex items-center gap-4 flex-wrap justify-center">
            <div className="bg-[#F0EDFF] dark:bg-[#262A34] rounded-xl px-3 py-1.5 flex items-center gap-2">
              <span className="text-xs font-urbanist font-semibold text-[#757575] dark:text-[#BDBDBD]">Moves</span>
              <span className="font-urbanist font-extrabold text-sm text-[#212121] dark:text-white">{totalMoves}</span>
            </div>
            <div className="bg-[#F0EDFF] dark:bg-[#262A34] rounded-xl px-3 py-1.5 flex items-center gap-2">
              <span className="text-xs font-urbanist font-semibold text-[#757575] dark:text-[#BDBDBD]">Difficulty</span>
              <span className="bg-[#6949FF]/10 text-[#6949FF] dark:text-purple-300 text-xs font-extrabold px-2 py-0.5 rounded-full">{difficulty.toUpperCase()}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full mt-2">
            <button
              onClick={onPlayAgain}
              className="w-full h-12 rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white font-urbanist font-bold text-base transition-all duration-200 active:scale-95 shadow-md shadow-[#6949FF]/20"
            >
              Play Again
            </button>
            <button
              onClick={handleNewGameSetup}
              className="w-full h-11 rounded-full border-2 border-[#6949FF] text-[#6949FF] dark:text-white bg-white dark:bg-[#262A34] hover:bg-[#6949FF] hover:text-white font-urbanist font-bold text-sm transition-all duration-200 active:scale-95"
            >
              New Game Setup
            </button>
            <button
              onClick={handleBackToLobby}
              className="text-xs font-urbanist font-semibold text-[#757575] dark:text-[#BDBDBD] hover:underline pt-1"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      )}

      {/* Lose Modal */}
      {modalType === 'lose' && (
        <div
          className="w-full max-w-md bg-white dark:bg-[#1F222A] rounded-3xl p-6 sm:p-8 border border-red-500/30 shadow-2xl flex flex-col items-center text-center gap-5 animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/40 text-red-500 flex items-center justify-center">
            <ShieldAlert size={36} />
          </div>

          <div className="flex flex-col gap-1">
            <h2 className="font-urbanist font-extrabold text-2xl sm:text-3xl text-[#212121] dark:text-white">
              YOU LOST
            </h2>
            <p className="font-urbanist text-xs sm:text-sm text-[#757575] dark:text-[#BDBDBD]">
              {winner === 'black' ? 'Black' : 'White'} wins by checkmate
            </p>
          </div>

          <div className="flex items-center gap-4 flex-wrap justify-center">
            <div className="bg-[#F0EDFF] dark:bg-[#262A34] rounded-xl px-3 py-1.5 flex items-center gap-2">
              <span className="text-xs font-urbanist font-semibold text-[#757575] dark:text-[#BDBDBD]">Moves</span>
              <span className="font-urbanist font-extrabold text-sm text-[#212121] dark:text-white">{totalMoves}</span>
            </div>
            <div className="bg-[#F0EDFF] dark:bg-[#262A34] rounded-xl px-3 py-1.5 flex items-center gap-2">
              <span className="text-xs font-urbanist font-semibold text-[#757575] dark:text-[#BDBDBD]">Difficulty</span>
              <span className="bg-[#6949FF]/10 text-[#6949FF] dark:text-purple-300 text-xs font-extrabold px-2 py-0.5 rounded-full">{difficulty.toUpperCase()}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full mt-2">
            <button
              onClick={onPlayAgain}
              className="w-full h-12 rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white font-urbanist font-bold text-base transition-all duration-200 active:scale-95 shadow-md shadow-[#6949FF]/20"
            >
              Play Again
            </button>
            <button
              onClick={handleNewGameSetup}
              className="w-full h-11 rounded-full border-2 border-[#6949FF] text-[#6949FF] dark:text-white bg-white dark:bg-[#262A34] hover:bg-[#6949FF] hover:text-white font-urbanist font-bold text-sm transition-all duration-200 active:scale-95"
            >
              Change Difficulty / Setup
            </button>
            <button
              onClick={handleBackToLobby}
              className="text-xs font-urbanist font-semibold text-[#757575] dark:text-[#BDBDBD] hover:underline pt-1"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      )}

      {/* Draw Modal */}
      {modalType === 'draw' && (
        <div
          className="w-full max-w-md bg-white dark:bg-[#1F222A] rounded-3xl p-6 sm:p-8 border border-blue-500/30 shadow-2xl flex flex-col items-center text-center gap-5 animate-fadeIn"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-500 flex items-center justify-center">
            <RefreshCw size={36} />
          </div>

          <div className="flex flex-col gap-1">
            <h2 className="font-urbanist font-extrabold text-2xl sm:text-3xl text-[#212121] dark:text-white">
              DRAW
            </h2>
            <p className="font-urbanist text-xs sm:text-sm text-[#757575] dark:text-[#BDBDBD]">
              <span className="font-bold text-[#6949FF] capitalize">{drawReason || 'Stalemate'}</span>
            </p>
          </div>

          <div className="flex items-center gap-4 flex-wrap justify-center">
            <div className="bg-[#F0EDFF] dark:bg-[#262A34] rounded-xl px-3 py-1.5 flex items-center gap-2">
              <span className="text-xs font-urbanist font-semibold text-[#757575] dark:text-[#BDBDBD]">Moves</span>
              <span className="font-urbanist font-extrabold text-sm text-[#212121] dark:text-white">{totalMoves}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full mt-2">
            <button
              onClick={onPlayAgain}
              className="w-full h-12 rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white font-urbanist font-bold text-base transition-all duration-200 active:scale-95 shadow-md shadow-[#6949FF]/20"
            >
              Play Again
            </button>
            <button
              onClick={handleBackToLobby}
              className="w-full h-11 rounded-full border-2 border-gray-300 dark:border-gray-700 text-[#757575] dark:text-white font-urbanist font-bold text-sm transition-all duration-200 active:scale-95"
            >
              Back to Lobby
            </button>
          </div>
        </div>
      )}

      {/* Restart Confirmation */}
      {modalType === 'restart_confirm' && (
        <div className="w-full max-w-sm bg-white dark:bg-[#1F222A] rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-2xl flex flex-col items-center text-center gap-4">
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
              className="h-10 rounded-full bg-[#6949FF] text-white font-urbanist font-bold text-sm transition-all active:scale-95"
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
        <div className="w-full max-w-sm bg-white dark:bg-[#1F222A] rounded-2xl p-6 border border-red-200 dark:border-red-900/50 shadow-2xl flex flex-col items-center text-center gap-4">
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
