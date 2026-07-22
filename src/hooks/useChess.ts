'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { Chess, Square, PieceType as EnginePieceType, Color } from '@/lib/chess/chessEngine'
import { BoardGrid, BoardThemeId, ChessPieceData, PieceColor, PieceType } from '@/utils/chess'
import { PieceThemeId } from '@/components/chess/SvgChessPiece'
import { getBestAiMove, AiDifficulty } from '@/utils/chess/stockfishAi'
import { chessAudio } from '@/utils/chess/chessAudio'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PIECE_TYPE_MAP: Record<EnginePieceType, PieceType> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
}

const PIECE_VALUES: Record<PieceType, number> = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: 0,
}

const INITIAL_TIME_SECONDS = 600 // 10 minutes per player

export function formatTime(seconds: number): string {
  const m = Math.floor(Math.max(0, seconds) / 60)
  const s = Math.floor(Math.max(0, seconds) % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GameMode = 'pve' | 'pvp'
export type PlayerSide = 'white' | 'black'
export type ModalType = 'none' | 'promotion' | 'win' | 'lose' | 'draw' | 'restart_confirm' | 'resign_confirm'
export type DrawReason = 'stalemate' | 'threefold' | '50move' | 'insufficient'

export interface MoveRecord {
  san: string
  from: Square
  to: Square
  fen: string
  piece: PieceType
  color: PieceColor
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useChess() {
  const searchParams = useSearchParams()

  // Game options
  const difficulty = (searchParams.get('difficulty') || 'easy') as AiDifficulty
  const mode = (searchParams.get('mode') || 'pve') as GameMode
  const side = (searchParams.get('side') || 'white') as PlayerSide
  const boardThemeId = (searchParams.get('theme') || 'classic') as BoardThemeId
  const pieceThemeId = (searchParams.get('pieceTheme') || 'classic') as PieceThemeId

  const timeParam = parseInt(searchParams.get('time') || '', 10)
  const incrementParam = parseInt(searchParams.get('increment') || '', 10)
  const initialTimeSeconds = Math.max(60, isNaN(timeParam) ? 600 : timeParam)
  const incrementSeconds = Math.max(0, isNaN(incrementParam) ? 0 : incrementParam)

  // Store mode/side in refs so callbacks never go stale
  const modeRef = useRef(mode)
  const sideRef = useRef(side)
  const difficultyRef = useRef(difficulty)
  useEffect(() => { modeRef.current = mode }, [mode])
  useEffect(() => { sideRef.current = side }, [side])
  useEffect(() => { difficultyRef.current = difficulty }, [difficulty])

  // Single Chess engine instance
  const chessRef = useRef<Chess | null>(null)

  // Board version counter — forces re-render after every board sync
  const [boardVersion, setBoardVersion] = useState(0)

  // React state
  const [boardGrid, setBoardGrid] = useState<BoardGrid>([])
  const [turn, setTurn] = useState<PieceColor>('white')
  const [gameStatus, setGameStatus] = useState<'playing' | 'checkmate' | 'stalemate' | 'draw' | 'resigned' | 'timeout'>('playing')
  const [drawReason, setDrawReason] = useState<DrawReason | null>(null)
  const [winner, setWinner] = useState<PieceColor | null>(null)
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)
  const [legalMoves, setLegalMoves] = useState<Square[]>([])
  const [captureMoves, setCaptureMoves] = useState<Square[]>([])
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null)
  const [inCheck, setInCheck] = useState(false)
  const [kingInCheckSquare, setKingInCheckSquare] = useState<Square | null>(null)
  const [moveHistory, setMoveHistory] = useState<MoveRecord[]>([])
  const [reviewIndex, setReviewIndex] = useState<number | null>(null)
  const [capturedPieces, setCapturedPieces] = useState<{
    byWhite: PieceType[]
    byBlack: PieceType[]
    whiteScore: number
    blackScore: number
  }>({ byWhite: [], byBlack: [], whiteScore: 0, blackScore: 0 })
  const [isFlipped, setIsFlipped] = useState(side === 'black')
  const [isMuted, setIsMuted] = useState(false)
  useEffect(() => {
    setIsMuted(chessAudio.getIsMuted())
  }, [])
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [activeModal, setActiveModal] = useState<ModalType>('none')
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null)

  const aiTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Ref to stabilize closure-dependent values (must be after state decls)
  const isAiThinkingRef = useRef(isAiThinking)
  useEffect(() => { isAiThinkingRef.current = isAiThinking }, [isAiThinking])

  // Countdown timers (seconds)
  const [whiteTime, setWhiteTime] = useState(initialTimeSeconds)
  const [blackTime, setBlackTime] = useState(initialTimeSeconds)

  // -------------------------------------------------------------------
  // Body scroll lock
  // -------------------------------------------------------------------
  useEffect(() => {
    if (activeModal !== 'none' && activeModal !== 'promotion') {
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
  }, [activeModal])

  // -------------------------------------------------------------------
  // Timer Interval Loop (configurable clocks for White and Black)
  // -------------------------------------------------------------------
  useEffect(() => {
    if (gameStatus !== 'playing') return

    const tick = setInterval(() => {
      if (turn === 'white') {
        setWhiteTime((prev) => {
          if (prev <= 30 && prev > 0) chessAudio.playTimerTick()
          return prev <= 1 ? 0 : prev - 1
        })
      } else {
        setBlackTime((prev) => {
          if (prev <= 30 && prev > 0) chessAudio.playTimerTick()
          return prev <= 1 ? 0 : prev - 1
        })
      }
    }, 1000)

    return () => clearInterval(tick)
  }, [turn, gameStatus])

  // -------------------------------------------------------------------
  // Timeout Game Over Evaluation
  // -------------------------------------------------------------------
  useEffect(() => {
    if (gameStatus !== 'playing') return

    if (whiteTime <= 0) {
      setGameStatus('timeout')
      setWinner('black')
      const userSideColor = sideRef.current === 'black' ? 'black' : 'white'
      setActiveModal(userSideColor === 'black' ? 'win' : 'lose')
    } else if (blackTime <= 0) {
      setGameStatus('timeout')
      setWinner('white')
      const userSideColor = sideRef.current === 'black' ? 'black' : 'white'
      setActiveModal(userSideColor === 'white' ? 'win' : 'lose')
    }
  }, [whiteTime, blackTime, gameStatus])

  // -------------------------------------------------------------------
  // syncBoardState
  // -------------------------------------------------------------------
  const syncBoardState = useCallback((chess: Chess) => {
    const rawBoard = chess.board()
    const grid: BoardGrid = []
    const currentTurnColor: Color = chess.turn()
    const isCheckNow = chess.inCheck()
    let checkSq: Square | null = null

    for (let r = 0; r < 8; r++) {
      const row: (ChessPieceData | null)[] = []
      for (let c = 0; c < 8; c++) {
        const item = rawBoard[r][c]
        if (item) {
          row.push({ type: PIECE_TYPE_MAP[item.type], color: item.color === 'w' ? 'white' : 'black' })
          if (isCheckNow && item.type === 'k' && item.color === currentTurnColor) {
            checkSq = item.square
          }
        } else {
          row.push(null)
        }
      }
      grid.push(row)
    }

    setBoardGrid(grid)
    setTurn(chess.turn() === 'w' ? 'white' : 'black')
    setInCheck(isCheckNow)
    setKingInCheckSquare(checkSq)

    // Captured pieces from history
    const whiteCaptured: PieceType[] = []
    const blackCaptured: PieceType[] = []
    let wScore = 0, bScore = 0
    chess.history({ verbose: true }).forEach((m: any) => {
      if (m.captured) {
        const pType = PIECE_TYPE_MAP[m.captured as EnginePieceType]
        const pVal = PIECE_VALUES[pType]
        if (m.color === 'w') { whiteCaptured.push(pType); wScore += pVal }
        else { blackCaptured.push(pType); bScore += pVal }
      }
    })
    setCapturedPieces({ byWhite: whiteCaptured, byBlack: blackCaptured, whiteScore: wScore, blackScore: bScore })
    setBoardVersion(prev => prev + 1)
  }, [])

  // -------------------------------------------------------------------
  // checkGameOver
  // -------------------------------------------------------------------
  const checkGameOver = useCallback((chess: Chess): boolean => {
    if (chess.isCheckmate()) {
      setGameStatus('checkmate')
      const winColor: PieceColor = chess.turn() === 'w' ? 'black' : 'white'
      setWinner(winColor)
      const userSideColor = sideRef.current === 'black' ? 'black' : 'white'
      const isUserWinner = modeRef.current === 'pvp' || winColor === userSideColor
      setActiveModal(isUserWinner ? 'win' : 'lose')
      chessAudio.playCheckmate()
      return true
    }
    if (chess.isDraw()) {
      setGameStatus('draw')
      let reason: DrawReason = 'stalemate'
      if (chess.isStalemate()) reason = 'stalemate'
      else if (chess.isThreefoldRepetition()) reason = 'threefold'
      else if (chess.isInsufficientMaterial()) reason = 'insufficient'
      else reason = '50move'
      setDrawReason(reason)
      setActiveModal('draw')
      return true
    }
    if (chess.inCheck()) chessAudio.playCheck()
    return false
  }, [])

  // -------------------------------------------------------------------
  // saveState
  // -------------------------------------------------------------------
  const saveState = useCallback(() => {
    if (typeof window !== 'undefined' && chessRef.current) {
      sessionStorage.setItem('puzzroo_chess_fen', chessRef.current.fen())
    }
  }, [])

  // -------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------
  useEffect(() => {
    const chess = new Chess()

    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('puzzroo_chess_fen')
      localStorage.removeItem('puzzroo_chess_fen')
      chess.load('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
    }

    chessRef.current = chess

    setGameStatus('playing')
    setDrawReason(null)
    setWinner(null)
    setActiveModal('none')
    setSelectedSquare(null)
    setLegalMoves([])
    setCaptureMoves([])
    setLastMove(null)
    setMoveHistory([])
    setReviewIndex(null)
    setIsAiThinking(false)
    setWhiteTime(initialTimeSeconds)
    setBlackTime(initialTimeSeconds)

    syncBoardState(chess)

    if (chess.history().length > 0) {
      checkGameOver(chess)
    } else {
      chessAudio.playGameStart()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // -------------------------------------------------------------------
  // Execute Move (allows isAiCall=true to bypass isAiThinking lock)
  // -------------------------------------------------------------------
  const executeMove = useCallback(
    (from: Square, to: Square, promotionPiece?: PieceType, isAiCall: boolean = false): boolean => {
      const chess = chessRef.current
      if (!chess || gameStatus !== 'playing') return false

      // Human moves blocked during AI turn
      if (isAiThinkingRef.current && !isAiCall) return false

      // Pawn promotion interstitial
      const piece = chess.get(from)
      const toRank = to[1]
      const isPawnPromotion =
        piece?.type === 'p' &&
        ((piece.color === 'w' && toRank === '8') || (piece.color === 'b' && toRank === '1'))
      if (isPawnPromotion && !promotionPiece) {
        setSelectedSquare(null)
        setLegalMoves([])
        setCaptureMoves([])
        setPendingPromotion({ from, to })
        setActiveModal('promotion')
        return false
      }

      const enginePromotion = promotionPiece ? (promotionPiece[0] as EnginePieceType) : undefined
      const moveResult = chess.move({ from, to, promotion: enginePromotion })
      if (!moveResult) return false

      // Fischer increment: add time after each move
      if (incrementSeconds > 0) {
        if (moveResult.color === 'w') {
          setWhiteTime(prev => prev + incrementSeconds)
        } else {
          setBlackTime(prev => prev + incrementSeconds)
        }
      }

      // Audio feedback
      if (moveResult.captured) chessAudio.playCapture()
      else if (moveResult.promotion) chessAudio.playPromotion()
      else chessAudio.playMove()

      setLastMove({ from, to })
      setSelectedSquare(null)
      setLegalMoves([])
      setCaptureMoves([])
      setReviewIndex(null)

      setMoveHistory(prev => [
        ...prev,
        {
          san: moveResult.san,
          from,
          to,
          fen: chess.fen(),
          piece: PIECE_TYPE_MAP[moveResult.piece],
          color: moveResult.color === 'w' ? 'white' : 'black',
        },
      ])

      syncBoardState(chess)
      checkGameOver(chess)
      saveState()

      return true
    },
    [gameStatus, syncBoardState, checkGameOver, saveState]
  )

  // -------------------------------------------------------------------
  // AI turn loop (Triggers when turn switches to AI opponent)
  // -------------------------------------------------------------------
  useEffect(() => {
    if (mode !== 'pve' || gameStatus !== 'playing') return
    if (!chessRef.current) return

    const currentTurnColor: Color = chessRef.current.turn()
    const isPlayerTurn =
      (side === 'white' && currentTurnColor === 'w') ||
      (side === 'black' && currentTurnColor === 'b')

    if (!isPlayerTurn && !isAiThinkingRef.current) {
      const fenAtStart = chessRef.current.fen()
      let isRetry = false
      setIsAiThinking(true)

      const tryExecuteAiMove = () => {
        if (!chessRef.current) return
        getBestAiMove(chessRef.current, difficulty)
          .then((aiMove) => {
            if (aiTimerRef.current) clearTimeout(aiTimerRef.current)
            aiTimerRef.current = setTimeout(() => {
              // Verify position hasn't changed (e.g. user performed Undo or Restart)
              if (!chessRef.current || chessRef.current.fen() !== fenAtStart) {
                setIsAiThinking(false)
                return
              }

              if (aiMove) {
                if (sideRef.current === 'white') {
                  setBlackTime(prev => (prev > 0 ? prev - 1 : 0))
                } else {
                  setWhiteTime(prev => (prev > 0 ? prev - 1 : 0))
                }
                const moveSuccess = executeMove(
                  aiMove.from,
                  aiMove.to,
                  aiMove.promotion ? PIECE_TYPE_MAP[aiMove.promotion] : undefined,
                  true
                )
                if (!moveSuccess && !isRetry) {
                  isRetry = true
                  tryExecuteAiMove()
                } else {
                  setIsAiThinking(false)
                }
              } else {
                setIsAiThinking(false)
              }
            }, 600)
          })
          .catch(() => {
            if (!isRetry) {
              isRetry = true
              tryExecuteAiMove()
            } else {
              setIsAiThinking(false)
            }
          })
      }

      tryExecuteAiMove()
    }
  }, [turn, mode, side, difficulty, gameStatus])

  // -------------------------------------------------------------------
  // Square selection
  // -------------------------------------------------------------------
  const selectSquare = useCallback(
    (square: Square) => {
      if (gameStatus !== 'playing' || isAiThinking) return

      const chess = chessRef.current
      if (!chess) return

      // Exiting history review mode safely
      if (reviewIndex !== null) {
        setReviewIndex(null)
        syncBoardState(chess)
        setSelectedSquare(null)
        setLegalMoves([])
        setCaptureMoves([])
        return
      }

      const currentTurnColor = chess.turn()
      const isPlayerTurn =
        mode === 'pvp' ||
        (side === 'white' && currentTurnColor === 'w') ||
        (side === 'black' && currentTurnColor === 'b')

      if (!isPlayerTurn) return

      // Move to destination
      if (selectedSquare && legalMoves.includes(square)) {
        executeMove(selectedSquare, square)
        return
      }

      // Select a piece
      const piece = chess.get(square)
      if (piece && piece.color === currentTurnColor) {
        const verboseMoves = chess.moves({ square, verbose: true })
        const targets: Square[] = []
        const captures: Square[] = []
        verboseMoves.forEach((m: any) => {
          const destPiece = chess.get(m.to)
          // Strict Rule: Never allow move or capture targets on friendly pieces!
          if (!destPiece || destPiece.color !== currentTurnColor) {
            targets.push(m.to)
            if (m.captured || (destPiece && destPiece.color !== currentTurnColor)) {
              captures.push(m.to)
            }
          }
        })
        if (targets.length > 0) {
          setSelectedSquare(square)
          setLegalMoves(targets)
          setCaptureMoves(captures)
        } else {
          setSelectedSquare(null)
          setLegalMoves([])
          setCaptureMoves([])
        }
      } else {
        setSelectedSquare(null)
        setLegalMoves([])
        setCaptureMoves([])
      }
    },
    [gameStatus, isAiThinking, reviewIndex, mode, side, selectedSquare, legalMoves, executeMove, syncBoardState]
  )

  // -------------------------------------------------------------------
  // Pawn promotion choice
  // -------------------------------------------------------------------
  const handleSelectPromotion = useCallback(
    (pPiece: PieceType) => {
      if (pendingPromotion) {
        executeMove(pendingPromotion.from, pendingPromotion.to, pPiece)
        setPendingPromotion(null)
        setActiveModal('none')
      }
    },
    [pendingPromotion, executeMove]
  )

  // -------------------------------------------------------------------
  // Undo
  // -------------------------------------------------------------------
  // -------------------------------------------------------------------
  // Undo
  // -------------------------------------------------------------------
  const undoMove = useCallback(() => {
    if (gameStatus !== 'playing') return
    const chess = chessRef.current
    if (!chess) return

    if (aiTimerRef.current) {
      clearTimeout(aiTimerRef.current)
      aiTimerRef.current = null
    }
    setIsAiThinking(false)

    setPendingPromotion(null)
    setActiveModal('none')

    const historyLen = chess.history().length
    if (historyLen === 0) return

    if (mode === 'pve') {
      if (historyLen >= 2) {
        chess.undo()
        chess.undo()
        setMoveHistory(prev => prev.slice(0, -2))
      } else if (historyLen === 1) {
        chess.undo()
        setMoveHistory([])
      }
    } else {
      chess.undo()
      setMoveHistory(prev => prev.slice(0, -1))
    }

    setSelectedSquare(null)
    setLegalMoves([])
    setCaptureMoves([])
    setLastMove(null)
    syncBoardState(chess)
    saveState()
  }, [gameStatus, mode, syncBoardState, saveState])

  // -------------------------------------------------------------------
  // Restart
  // -------------------------------------------------------------------
  const restartGame = useCallback(() => {
    if (aiTimerRef.current) {
      clearTimeout(aiTimerRef.current)
      aiTimerRef.current = null
    }
    setIsAiThinking(false)

    const chess = new Chess()
    chessRef.current = chess
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('puzzroo_chess_fen')
      localStorage.removeItem('puzzroo_chess_fen')
    }
    setPendingPromotion(null)
    setSelectedSquare(null)
    setLegalMoves([])
    setCaptureMoves([])
    setLastMove(null)
    setMoveHistory([])
    setReviewIndex(null)
    setIsAiThinking(false)
    setGameStatus('playing')
    setDrawReason(null)
    setWinner(null)
    setActiveModal('none')
    setWhiteTime(initialTimeSeconds)
    setBlackTime(initialTimeSeconds)
    syncBoardState(chess)
  }, [syncBoardState, initialTimeSeconds])

  // -------------------------------------------------------------------
  // Resign
  // -------------------------------------------------------------------
  const resignGame = useCallback(() => {
    setGameStatus('resigned')
    const winColor: PieceColor = turn === 'white' ? 'black' : 'white'
    setWinner(winColor)
    const userSideColor = sideRef.current === 'black' ? 'black' : 'white'
    const isUserWinner = modeRef.current === 'pvp' || winColor === userSideColor
    setActiveModal(isUserWinner ? 'win' : 'lose')
  }, [turn])

  // -------------------------------------------------------------------
  // Move review / replay
  // -------------------------------------------------------------------
  const reviewHistoryMove = useCallback((index: number | null) => {
    setReviewIndex(index)
    if (index === null) {
      if (chessRef.current) syncBoardState(chessRef.current)
    } else {
      const rec = moveHistory[index]
      if (rec) {
        const tempChess = new Chess(rec.fen)
        const rawBoard = tempChess.board()
        const grid: BoardGrid = []
        for (let r = 0; r < 8; r++) {
          const row: (ChessPieceData | null)[] = []
          for (let c = 0; c < 8; c++) {
            const item = rawBoard[r][c]
            row.push(item
              ? { type: PIECE_TYPE_MAP[item.type], color: item.color === 'w' ? 'white' : 'black' }
              : null)
          }
          grid.push(row)
        }
        setBoardGrid(grid)
      }
    }
  }, [moveHistory, syncBoardState])

  // -------------------------------------------------------------------
  // UI helpers
  // -------------------------------------------------------------------
  const toggleSound = useCallback(() => {
    setIsMuted(chessAudio.toggleMute())
  }, [])

  const flipBoard = useCallback(() => {
    setIsFlipped(prev => !prev)
  }, [])

  const cancelPromotion = useCallback(() => {
    setPendingPromotion(null)
    setActiveModal('none')
    setSelectedSquare(null)
    setLegalMoves([])
    setCaptureMoves([])
  }, [])

  // -------------------------------------------------------------------
  // Return
  // -------------------------------------------------------------------
  return {
    boardGrid, turn, gameStatus, drawReason, winner,
    difficulty, mode, side, boardThemeId, pieceThemeId,
    selectedSquare, legalMoves, captureMoves, lastMove,
    inCheck, kingInCheckSquare,
    moveHistory, reviewIndex, capturedPieces,
    isFlipped, isMuted, isAiThinking,
    activeModal, pendingPromotion,
    whiteTime, blackTime,

    selectSquare, executeMove, handleSelectPromotion, cancelPromotion,
    undoMove, restartGame, resignGame, reviewHistoryMove,
    toggleSound, flipBoard, setActiveModal,
  }
}

export default useChess
