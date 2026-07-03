'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  TangramPiece,
  TangramPieceType,
  GameStatus,
} from '@/types/tangram'
import { TangramPuzzle, TangramDifficulty, MAX_HINTS } from '@/types/tangram-puzzle'
import { validatePuzzle, getSolvedSquarePositions } from '@/lib/tangram/validation'
import { TRAY_LAYOUT } from '@/lib/tangram/trayLayout'
import { getRandomPuzzle } from '@/data/tangram'
import { saveCompletedPuzzle } from '@/data/tangram/past-puzzles'

// Initial pieces using canonical tray positions
const INITIAL_PIECES: TangramPiece[] = [
  {
    id: 'large-triangle-1',
    type: 'large-triangle-1',
    position: { ...TRAY_LAYOUT['large-triangle-1'] },
    trayPosition: { ...TRAY_LAYOUT['large-triangle-1'] },
    color: '#4A90E2',
    isPlaced: false,
  },
  {
    id: 'large-triangle-2',
    type: 'large-triangle-2',
    position: { ...TRAY_LAYOUT['large-triangle-2'] },
    trayPosition: { ...TRAY_LAYOUT['large-triangle-2'] },
    color: '#5C6BC0',
    isPlaced: false,
  },
  {
    id: 'medium-triangle',
    type: 'medium-triangle',
    position: { ...TRAY_LAYOUT['medium-triangle'] },
    trayPosition: { ...TRAY_LAYOUT['medium-triangle'] },
    color: '#F4A261',
    isPlaced: false,
  },
  {
    id: 'small-triangle-1',
    type: 'small-triangle-1',
    position: { ...TRAY_LAYOUT['small-triangle-1'] },
    trayPosition: { ...TRAY_LAYOUT['small-triangle-1'] },
    color: '#E76F51',
    isPlaced: false,
  },
  {
    id: 'small-triangle-2',
    type: 'small-triangle-2',
    position: { ...TRAY_LAYOUT['small-triangle-2'] },
    trayPosition: { ...TRAY_LAYOUT['small-triangle-2'] },
    color: '#2A9D8F',
    isPlaced: false,
  },
  {
    id: 'square',
    type: 'square',
    position: { ...TRAY_LAYOUT['square'] },
    trayPosition: { ...TRAY_LAYOUT['square'] },
    color: '#E63946',
    isPlaced: false,
  },
  {
    id: 'parallelogram',
    type: 'parallelogram',
    position: { ...TRAY_LAYOUT['parallelogram'] },
    trayPosition: { ...TRAY_LAYOUT['parallelogram'] },
    color: '#78C2AD',
    isPlaced: false,
  },
]

interface UseTangramOptions {
  difficulty?: TangramDifficulty
  puzzleId?: string
}

export function useTangram(options: UseTangramOptions = {}) {
  const { difficulty = 'easy' } = options
  
  const [currentPuzzle, setCurrentPuzzle] = useState<TangramPuzzle | null>(() => {
    return getRandomPuzzle(difficulty) as any
  })
  
  const [pieces, setPieces] = useState<TangramPiece[]>(INITIAL_PIECES)
  const [selectedPiece, setSelectedPiece] = useState<TangramPieceType | null>(null)
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing')
  const [timeRemaining, setTimeRemaining] = useState(99999) // ⏱️ UNLIMITED TIME FOR MANUAL POSITIONING
  const [score, setScore] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [hintPiece, setHintPiece] = useState<TangramPieceType | null>(null)
  const [isSolved, setIsSolved] = useState(false)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const isAutoFilling = useRef(false)
  const validationTimeout = useRef<NodeJS.Timeout | null>(null)

  // Countdown Timer - DISABLED FOR MANUAL POSITIONING
  useEffect(() => {
    // Timer disabled - return early
    return
    
    /* Original timer code - commented out
    if (gameStatus !== 'playing') {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      return
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining((t) => {
        if (t <= 1) {
          setGameStatus('lost')
          return 0
        }
        return t - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
    */
  }, [gameStatus])

  // Validate puzzle after pieces change with debounce
  useEffect(() => {
    if (gameStatus !== 'playing' || isSolved) return
    
    // Debounce validation to prevent rapid re-checks
    if (validationTimeout.current) {
      clearTimeout(validationTimeout.current)
    }

    validationTimeout.current = setTimeout(() => {
      const validation = validatePuzzle(pieces)
      
      if (validation.isSolved && !isSolved) {
        if (isAutoFilling.current) {
          setTimeout(() => {
            handlePuzzleComplete()
          }, 1000)
        } else {
          handlePuzzleComplete()
        }
      }
    }, 300)

    return () => {
      if (validationTimeout.current) {
        clearTimeout(validationTimeout.current)
      }
    }
  }, [pieces, gameStatus, isSolved])

  // Handle puzzle completion
  const handlePuzzleComplete = useCallback(() => {
    setIsSolved(true)
    setGameStatus('won')
    
    const finalScore = Math.max(0, 1000 + timeRemaining * 5 - hintsUsed * 100)
    setScore(finalScore)
    
    if (currentPuzzle) {
      saveCompletedPuzzle({
        id: currentPuzzle.id,
        title: currentPuzzle.title,
        difficulty: currentPuzzle.difficulty,
        score: finalScore,
        remainingTime: timeRemaining,
        completedAt: new Date().toISOString(),
        hintsUsed,
      })
    }
  }, [timeRemaining, hintsUsed, currentPuzzle])

  // Select piece
  const selectPiece = useCallback((pieceId: TangramPieceType) => {
    setSelectedPiece(pieceId)
  }, [])

  // Deselect piece
  const deselectPiece = useCallback(() => {
    setSelectedPiece(null)
  }, [])

  // Move piece
  const movePiece = useCallback((pieceId: TangramPieceType, x: number, y: number) => {
    setPieces((prevPieces) =>
      prevPieces.map((piece) => {
        if (piece.id === pieceId) {
          const updatedPiece = { ...piece, position: { ...piece.position, x, y }, isPlaced: true }
          
          // 🔍 CONSOLE LOG: Show piece details for manual positioning
          console.log('📍 PIECE MOVED:', {
            name: pieceId,
            x: x.toFixed(2),
            y: y.toFixed(2),
            rotation: piece.position.rotation
          })
          
          return updatedPiece
        }
        return piece
      })
    )
  }, [])

  // Rotate piece
  const rotatePiece = useCallback(
    (pieceId: TangramPieceType, direction: 1 | -1) => {
      setPieces((prevPieces) =>
        prevPieces.map((piece) => {
          if (piece.id !== pieceId) return piece
          const newRotation = piece.position.rotation + direction * 45
          
          // 🔍 CONSOLE LOG: Show rotation change
          console.log('🔄 PIECE ROTATED:', {
            name: pieceId,
            x: piece.position.x.toFixed(2),
            y: piece.position.y.toFixed(2),
            rotation: newRotation
          })
          
          return {
            ...piece,
            position: { ...piece.position, rotation: newRotation },
          }
        })
      )
    },
    []
  )

  const rotateLeft = useCallback(() => {
    if (selectedPiece) {
      rotatePiece(selectedPiece, -1)
    }
  }, [selectedPiece, rotatePiece])

  const rotateRight = useCallback(() => {
    if (selectedPiece) {
      rotatePiece(selectedPiece, 1)
    }
  }, [selectedPiece, rotatePiece])

  // Snap piece to exact position + rotation
  const snapPiece = useCallback((pieceId: TangramPieceType, x: number, y: number, rotation: number) => {
    setPieces((prevPieces) =>
      prevPieces.map((piece) =>
        piece.id === pieceId
          ? { ...piece, position: { x, y, rotation }, isPlaced: true }
          : piece
      )
    )
  }, [])

  // Undo move
  const undoMove = useCallback(() => {
    if (selectedPiece) {
      setPieces((prevPieces) =>
        prevPieces.map((piece) =>
          piece.id === selectedPiece
            ? { 
                ...piece, 
                isPlaced: false, 
                position: { ...piece.trayPosition }
              }
            : piece
        )
      )
    }
  }, [selectedPiece])

  // Request hint - track which pieces already got hints
  const shownHints = useRef<Set<TangramPieceType>>(new Set())
  
  const requestHint = useCallback(() => {
    if (hintsUsed >= MAX_HINTS || !currentPuzzle) return
    
    // Find unplaced pieces that haven't been shown as hints yet
    const unshownPieces = pieces.filter(
      p => !p.isPlaced && !shownHints.current.has(p.type)
    )
    
    // If all unplaced pieces have been shown, reset and start over
    if (unshownPieces.length === 0) {
      shownHints.current.clear()
      const unplacedPieces = pieces.filter(p => !p.isPlaced)
      if (unplacedPieces.length === 0) return
      
      const randomPiece = unplacedPieces[Math.floor(Math.random() * unplacedPieces.length)]
      shownHints.current.add(randomPiece.type)
      setHintsUsed((h) => h + 1)
      setHintPiece(randomPiece.type)
    } else {
      // Show a random piece from unshown pieces
      const randomPiece = unshownPieces[Math.floor(Math.random() * unshownPieces.length)]
      shownHints.current.add(randomPiece.type)
      setHintsUsed((h) => h + 1)
      setHintPiece(randomPiece.type)
    }
    
    setTimeout(() => {
      setHintPiece(null)
    }, 5000)
  }, [hintsUsed, pieces, currentPuzzle])

  // Auto Fill - Uses canonical solution directly
  const autoFill = useCallback(() => {
    if (!currentPuzzle) return
    
    const solvedPositions = getSolvedSquarePositions()
    isAutoFilling.current = true
    
    setPieces((prevPieces) =>
      prevPieces.map((piece) => {
        const solvedPos = solvedPositions[piece.type]
        if (solvedPos) {
          return {
            ...piece,
            position: { 
              x: solvedPos.x, 
              y: solvedPos.y, 
              rotation: solvedPos.rotation 
            },
            isPlaced: true,
          }
        }
        return piece
      })
    )

    setTimeout(() => {
      isAutoFilling.current = false
    }, 1500)
  }, [currentPuzzle])

  // Reset game
  const resetGame = useCallback(() => {
    setPieces(INITIAL_PIECES.map(p => ({
      ...p,
      position: { ...p.trayPosition },
      isPlaced: false,
    })))
    setSelectedPiece(null)
    setGameStatus('playing')
    setTimeRemaining(99999) // ⏱️ UNLIMITED TIME
    setScore(0)
    setHintsUsed(0)
    setHintPiece(null)
    setIsSolved(false)
    shownHints.current.clear() // Reset hint tracking
  }, [currentPuzzle])

  // New game
  const newGame = useCallback(() => {
    const newPuzzle = getRandomPuzzle(difficulty)
    setCurrentPuzzle(newPuzzle as any)
    setPieces(INITIAL_PIECES.map(p => ({
      ...p,
      position: { ...p.trayPosition },
      isPlaced: false,
    })))
    setSelectedPiece(null)
    setGameStatus('playing')
    setTimeRemaining(99999) // ⏱️ UNLIMITED TIME
    setScore(0)
    setHintsUsed(0)
    setHintPiece(null)
    setIsSolved(false)
    shownHints.current.clear() // Reset hint tracking
  }, [difficulty])

  // 🔍 HELPER: Print all pieces' current positions (for manual solution creation)
  const printAllPiecePositions = useCallback(() => {
    console.log('\n═══════════════════════════════════════')
    console.log('📋 ALL PIECE POSITIONS (Copy for solution):')
    console.log('═══════════════════════════════════════\n')
    
    pieces.forEach(piece => {
      // Board coordinates
      const boardX = piece.position.x
      const boardY = piece.position.y
      
      // Convert to RAW coordinates (reverse the processPuzzle transformation)
      // Divide by PIECE_SCALE (0.75) to get unscaled values
      const rawX = boardX / 0.75
      const rawY = boardY / 0.75
      
      console.log(`'${piece.type}': { x: UNIT * ${(rawX / 70.7).toFixed(4)}, y: UNIT * ${(rawY / 70.7).toFixed(4)}, rotation: ${piece.position.rotation} },`)
    })
    
    console.log('\n═══════════════════════════════════════\n')
  }, [pieces])

  // Auto-print positions when pieces change (after 1 second of no movement)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (gameStatus === 'playing') {
        printAllPiecePositions()
      }
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [pieces, gameStatus, printAllPiecePositions])

  return {
    pieces,
    selectedPiece,
    gameStatus,
    timeRemaining,
    score,
    hintsUsed,
    hintPiece,
    availableHints: MAX_HINTS - hintsUsed,
    isSolved,
    currentPuzzle,
    selectPiece,
    deselectPiece,
    movePiece,
    rotatePiece,
    rotateLeft,
    rotateRight,
    undoMove,
    requestHint,
    autoFill,
    resetGame,
    newGame,
    snapPiece,
  }
}