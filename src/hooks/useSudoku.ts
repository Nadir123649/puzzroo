/**
 * Sudoku State Hook - Phase 4 + 5 Complete
 * Centralized state management with:
 * - Multiple puzzle datasets
 * - Difficulty system
 * - Random puzzle loading
 * - Notes/Pencil mode
 * - Hint system with currency
 * - Score system
 * - Local storage persistence
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { SudokuBoard, Position, GameStatus, Difficulty } from '@/lib/sudoku/types'
import { getRandomPuzzle } from '@/data/sudoku'
import type { ScoreFeedback } from '@/components/games/sudoku/FloatingScoreFeedback'
import {
  getCellAt,
  updateCellValue,
  updateCellNote,
  clearCell,
  clearNotes,
  moveSelection,
  cloneBoard,
  isBoardComplete,
  validateBoardAgainstSolution,
  getCorrectValue,
  findEmptyCell,
  calculateAvailableHints,
  convertToSudokuBoard,
} from '@/lib/sudoku/helpers'
import { KEYBOARD_KEYS, INITIAL_GAME_STATE } from '@/lib/sudoku/constants'
import {
  saveGameState,
  loadGameState,
  clearGameState,
  saveDifficultyPreference,
  loadDifficultyPreference,
} from '@/lib/sudoku/storage'

export function useSudoku() {
  // Load difficulty preference
  const [difficulty, setDifficulty] = useState<Difficulty>(() => loadDifficultyPreference())
  
  // Initialize game state
  const initializeGame = useCallback((diff: Difficulty, loadSaved = true) => {
    // Try to load saved game first
    if (loadSaved) {
      const saved = loadGameState()
      if (saved && saved.difficulty === diff) {
        return {
          currentBoard: saved.currentBoard,
          initialBoard: saved.initialBoard,
          solution: saved.solution,
          puzzleId: saved.puzzleId,
          mistakes: saved.mistakes,
          score: saved.score,
          time: saved.time,
          gameStatus: saved.gameStatus as GameStatus,
        }
      }
    }

    // Load new random puzzle
    const puzzle = getRandomPuzzle(diff)
    const currentBoard = convertToSudokuBoard(puzzle.puzzle)
    const initialBoard = cloneBoard(currentBoard)
    const solution = convertToSudokuBoard(puzzle.solution)

    return {
      currentBoard,
      initialBoard,
      solution,
      puzzleId: puzzle.id,
      mistakes: 0,
      score: 0,
      time: 0,
      gameStatus: 'playing' as GameStatus,
    }
  }, [])

  const [gameState, setGameState] = useState(() => initializeGame(difficulty))
  
  // UI state
  const [selectedCell, setSelectedCell] = useState<Position | null>(null)
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null)
  const [notesMode, setNotesMode] = useState(false)
  const [isWinAnimating, setIsWinAnimating] = useState(false)
  const [scoreFeedbacks, setScoreFeedbacks] = useState<ScoreFeedback[]>([])

  // Timer
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)

  // Current refs for latest values
  const currentBoardRef = useRef(gameState.currentBoard)
  const scoreRef = useRef(gameState.score)
  const mistakesRef = useRef(gameState.mistakes)
  const timeRef = useRef(gameState.time)

  useEffect(() => {
    currentBoardRef.current = gameState.currentBoard
    scoreRef.current = gameState.score
    mistakesRef.current = gameState.mistakes
    timeRef.current = gameState.time
  }, [gameState])

  /**
   * Auto-save game state
   */
  useEffect(() => {
    if (gameState.gameStatus === 'playing') {
      saveGameState({
        currentBoard: gameState.currentBoard,
        initialBoard: gameState.initialBoard,
        solution: gameState.solution,
        difficulty,
        puzzleId: gameState.puzzleId,
        mistakes: gameState.mistakes,
        score: gameState.score,
        time: gameState.time,
        gameStatus: gameState.gameStatus,
      })
    }
  }, [gameState, difficulty])

  /**
   * Timer management
   */
  useEffect(() => {
    if (gameState.gameStatus === 'playing') {
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now() - (gameState.time * 1000)
      }

      timerRef.current = setInterval(() => {
        if (startTimeRef.current !== null) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
          setGameState((prev) => ({ ...prev, time: elapsed }))
        }
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [gameState.gameStatus, gameState.time])

  /**
   * Add score feedback animation
   */
  const addScoreFeedback = useCallback((value: number) => {
    const feedback: ScoreFeedback = {
      id: `${Date.now()}-${Math.random()}`,
      value,
      timestamp: Date.now(),
    }
    setScoreFeedbacks((prev) => [...prev, feedback])
  }, [])

  /**
   * Remove score feedback
   */
  const removeScoreFeedback = useCallback((id: string) => {
    setScoreFeedbacks((prev) => prev.filter((f) => f.id !== id))
  }, [])

  /**
   * Update score
   */
  const updateScore = useCallback((delta: number) => {
    setGameState((prev) => {
      const newScore = Math.max(0, prev.score + delta)
      return { ...prev, score: newScore }
    })
    if (delta !== 0) {
      addScoreFeedback(delta)
    }
  }, [addScoreFeedback])

  /**
   * Select cell
   */
  const selectCell = useCallback((position: Position | null) => {
    if (gameState.gameStatus !== 'playing') return
    setSelectedCell(position)
  }, [gameState.gameStatus])

  /**
   * Enter number or note
   */
  const enterNumber = useCallback(
    (num: number) => {
      if (!selectedCell || gameState.gameStatus !== 'playing') return

      const cell = getCellAt(gameState.currentBoard, selectedCell)
      if (!cell || cell.fixed) return

      // Notes mode - toggle note
      if (notesMode) {
        const newBoard = updateCellNote(gameState.currentBoard, selectedCell, num)
        setGameState((prev) => ({ ...prev, currentBoard: newBoard }))
        return
      }

      // Normal mode - enter final number
      const correctValue = getCorrectValue(gameState.solution, selectedCell)
      let newBoard = updateCellValue(gameState.currentBoard, selectedCell, num)
      
      // Clear notes when entering final number
      newBoard[selectedCell.row][selectedCell.col] = clearNotes(
        newBoard[selectedCell.row][selectedCell.col]
      )

      // Validate
      if (num !== correctValue) {
        // Wrong answer
        newBoard[selectedCell.row][selectedCell.col].isError = true
        
        setGameState((prev) => ({
          ...prev,
          currentBoard: newBoard,
          mistakes: prev.mistakes + 1,
        }))
        
        updateScore(-5) // -5 for wrong answer

        // Check game over
        if (gameState.mistakes + 1 >= INITIAL_GAME_STATE.maxMistakes) {
          setGameState((prev) => ({ ...prev, gameStatus: 'lost' }))
          clearGameState()
        }

        // Clear error after 1 second
        setTimeout(() => {
          setGameState((prev) => {
            const clearedBoard = cloneBoard(prev.currentBoard)
            if (clearedBoard[selectedCell.row]?.[selectedCell.col]) {
              clearedBoard[selectedCell.row][selectedCell.col].isError = false
            }
            return { ...prev, currentBoard: clearedBoard }
          })
        }, 1000)
      } else {
        // Correct answer
        updateScore(10) // +10 for correct answer
        
        setGameState((prev) => ({ ...prev, currentBoard: newBoard }))

        // Check for win
        if (isBoardComplete(newBoard) && validateBoardAgainstSolution(newBoard, gameState.solution)) {
          setIsWinAnimating(true)
          
          setTimeout(() => {
            setGameState((prev) => ({ ...prev, gameStatus: 'won' }))
            setIsWinAnimating(false)
            clearGameState()
          }, 1500)
        }
      }

      setSelectedNumber(num)
    },
    [selectedCell, gameState, notesMode, updateScore]
  )

  /**
   * Select number from pad
   */
  const selectNumber = useCallback(
    (num: number | null) => {
      setSelectedNumber(num)
      if (num !== null && selectedCell && gameState.gameStatus === 'playing') {
        enterNumber(num)
      }
    },
    [selectedCell, enterNumber, gameState.gameStatus]
  )

  /**
   * Erase cell
   */
  const eraseCell = useCallback(() => {
    if (!selectedCell || gameState.gameStatus !== 'playing') return

    const cell = getCellAt(gameState.currentBoard, selectedCell)
    if (!cell || cell.fixed) return

    const newBoard = clearCell(gameState.currentBoard, selectedCell)
    newBoard[selectedCell.row][selectedCell.col] = clearNotes(
      newBoard[selectedCell.row][selectedCell.col]
    )
    
    setGameState((prev) => ({ ...prev, currentBoard: newBoard }))
  }, [selectedCell, gameState])

  /**
   * Use hint
   */
  const requestHint = useCallback(() => {
    if (gameState.gameStatus !== 'playing') return

    const availableHints = calculateAvailableHints(gameState.score)
    if (availableHints <= 0) return

    const emptyCell = findEmptyCell(gameState.currentBoard)
    if (!emptyCell) return

    const correctValue = getCorrectValue(gameState.solution, emptyCell)
    if (!correctValue) return

    let newBoard = updateCellValue(gameState.currentBoard, emptyCell, correctValue)
    newBoard[emptyCell.row][emptyCell.col] = clearNotes(
      newBoard[emptyCell.row][emptyCell.col]
    )

    updateScore(-20) // -20 for hint
    setGameState((prev) => ({ ...prev, currentBoard: newBoard }))

    // Check for win
    if (isBoardComplete(newBoard) && validateBoardAgainstSolution(newBoard, gameState.solution)) {
      setIsWinAnimating(true)
      
      setTimeout(() => {
        setGameState((prev) => ({ ...prev, gameStatus: 'won' }))
        setIsWinAnimating(false)
        clearGameState()
      }, 1500)
    }
  }, [gameState, updateScore])

  /**
   * Change difficulty
   */
  const changeDifficulty = useCallback((newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty)
    saveDifficultyPreference(newDifficulty)
  }, [])

  /**
   * Reset board / New game
   */
  const resetBoard = useCallback(() => {
    const newGame = initializeGame(difficulty, false)
    setGameState(newGame)
    setSelectedCell(null)
    setSelectedNumber(null)
    setNotesMode(false)
    setIsWinAnimating(false)
    setScoreFeedbacks([])
    startTimeRef.current = null
  }, [difficulty, initializeGame])

  /**
   * Toggle notes mode
   */
  const toggleNotesMode = useCallback(() => {
    setNotesMode((prev) => !prev)
  }, [])

  /**
   * Keyboard handler
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState.gameStatus !== 'playing') return

      if (KEYBOARD_KEYS.ARROWS.includes(e.key as any)) {
        e.preventDefault()
      }

      if (KEYBOARD_KEYS.NUMBERS.includes(e.key as any)) {
        const num = parseInt(e.key, 10)
        enterNumber(num)
        return
      }

      if (KEYBOARD_KEYS.DELETE.includes(e.key as any)) {
        eraseCell()
        return
      }

      if (selectedCell && KEYBOARD_KEYS.ARROWS.includes(e.key as any)) {
        const directionMap = {
          ArrowUp: 'up' as const,
          ArrowDown: 'down' as const,
          ArrowLeft: 'left' as const,
          ArrowRight: 'right' as const,
        }
        const direction = directionMap[e.key as keyof typeof directionMap]
        if (direction) {
          const newPos = moveSelection(selectedCell, direction)
          setSelectedCell(newPos)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedCell, enterNumber, eraseCell, gameState.gameStatus])

  return {
    // State
    board: gameState.currentBoard,
    selectedCell,
    selectedNumber,
    notesMode,
    mistakes: gameState.mistakes,
    maxMistakes: INITIAL_GAME_STATE.maxMistakes,
    score: gameState.score,
    time: gameState.time,
    gameStatus: gameState.gameStatus,
    isWinAnimating,
    difficulty,
    availableHints: calculateAvailableHints(gameState.score),
    scoreFeedbacks,

    // Actions
    selectCell,
    selectNumber,
    enterNumber,
    eraseCell,
    resetBoard,
    toggleNotesMode,
    requestHint,
    changeDifficulty,
    removeScoreFeedback,
  }
}
