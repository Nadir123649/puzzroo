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
import { useRouter } from 'next/navigation'
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
  isValidMove,
  isValidCompletedBoard,
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
  const router = useRouter()
  
  // Load difficulty preference
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Initialize game state
  const initializeGame = useCallback((diff: Difficulty, loadSaved = true) => {
    // Try to load saved game first (client-side only)
    if (loadSaved && typeof window !== 'undefined') {
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

  const [gameState, setGameState] = useState(() => {
    // Client-only: load from storage or fresh
    const savedDifficulty = loadDifficultyPreference()
    return initializeGame(savedDifficulty, true)
  })
  
  // Load difficulty preference on client
  useEffect(() => {
    if (typeof window !== 'undefined' && !isInitialized) {
      const savedDifficulty = loadDifficultyPreference()
      setDifficulty(savedDifficulty)
      setIsInitialized(true)
    }
  }, [isInitialized])
  
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
    setSelectedCell(position)
  }, [])

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
      let newBoard = updateCellValue(gameState.currentBoard, selectedCell, num)
      
      // Clear notes when entering final number
      newBoard[selectedCell.row][selectedCell.col] = clearNotes(
        newBoard[selectedCell.row][selectedCell.col]
      )

      // Validate using Sudoku rules (no duplicates in row/column/box)
      const isValid = isValidMove(gameState.currentBoard, selectedCell, num)
      const correctValue = getCorrectValue(gameState.solution, selectedCell)

      // 🔍 DEBUG: Log validation details
      console.log('🎯 VALIDATION:', {
        row: selectedCell.row,
        col: selectedCell.col,
        enteredValue: num,
        isValidBySudokuRules: isValid,
        matchesSolution: num === correctValue,
        solutionValue: correctValue,
        puzzleId: gameState.puzzleId,
        difficulty,
      })

      // Validate based on Sudoku rules
      if (!isValid) {
        // Invalid move - violates Sudoku rules (duplicate in row/column/box)
        console.warn('❌ INVALID MOVE (Sudoku rules violated):', {
          row: selectedCell.row,
          col: selectedCell.col,
          enteredValue: num,
          puzzleId: gameState.puzzleId,
        })
        
        newBoard[selectedCell.row][selectedCell.col].isError = true
        newBoard[selectedCell.row][selectedCell.col].isCorrect = false
        
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
        
        // Error state persists - no setTimeout to clear it
      } else {
        // Valid move - follows Sudoku rules
        console.log('✅ VALID MOVE (Sudoku rules satisfied)')
        
        newBoard[selectedCell.row][selectedCell.col].isError = false
        newBoard[selectedCell.row][selectedCell.col].isCorrect = true
        updateScore(10) // +10 for correct answer
        
        setGameState((prev) => ({ ...prev, currentBoard: newBoard }))

        // Check for win - validate entire board using Sudoku rules
        if (isBoardComplete(newBoard) && isValidCompletedBoard(newBoard)) {
          console.log('🎉 PUZZLE COMPLETED! All Sudoku rules satisfied.')
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
    [selectedCell, gameState, notesMode, updateScore, difficulty]
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
    // Clear notes and reset state flags
    newBoard[selectedCell.row][selectedCell.col] = clearNotes(
      newBoard[selectedCell.row][selectedCell.col]
    )
    newBoard[selectedCell.row][selectedCell.col].isCorrect = false
    newBoard[selectedCell.row][selectedCell.col].isError = false
    
    console.log('🧹 CELL ERASED:', {
      row: selectedCell.row,
      col: selectedCell.col,
    })
    
    setGameState((prev) => ({ ...prev, currentBoard: newBoard }))
  }, [selectedCell, gameState])

  /**
   * Use hint - applies to selected cell, or random cell if none selected
   */
  const requestHint = useCallback(() => {
    if (gameState.gameStatus !== 'playing') return

    const availableHints = calculateAvailableHints(gameState.score)
    if (availableHints <= 0) return

    let targetCell: Position | null = null

    // If cell is selected, use it
    if (selectedCell) {
      const cell = getCellAt(gameState.currentBoard, selectedCell)
      // Only use selected cell if it's empty and not fixed
      if (cell && !cell.fixed && !cell.value) {
        targetCell = selectedCell
      }
    }

    // If no valid selected cell, find random empty cell
    if (!targetCell) {
      targetCell = findEmptyCell(gameState.currentBoard)
    }

    // No empty cells available
    if (!targetCell) return

    const correctValue = getCorrectValue(gameState.solution, targetCell)
    if (!correctValue) return

    let newBoard = updateCellValue(gameState.currentBoard, targetCell, correctValue)
    newBoard[targetCell.row][targetCell.col] = clearNotes(
      newBoard[targetCell.row][targetCell.col]
    )
    // Mark as correct
    newBoard[targetCell.row][targetCell.col].isCorrect = true

    updateScore(-20) // -20 for hint
    setGameState((prev) => ({ ...prev, currentBoard: newBoard }))

    // Check for win - validate entire board using Sudoku rules
    if (isBoardComplete(newBoard) && isValidCompletedBoard(newBoard)) {
      console.log('🎉 PUZZLE COMPLETED! All Sudoku rules satisfied.')
      setIsWinAnimating(true)
      
      setTimeout(() => {
        setGameState((prev) => ({ ...prev, gameStatus: 'won' }))
        setIsWinAnimating(false)
        clearGameState()
      }, 1500)
    }
  }, [selectedCell, gameState, updateScore])

  /**
   * Change difficulty
   */
  const changeDifficulty = useCallback((newDifficulty: Difficulty) => {
    console.log('🔄 DIFFICULTY CHANGED:', {
      from: difficulty,
      to: newDifficulty,
    })
    setDifficulty(newDifficulty)
    saveDifficultyPreference(newDifficulty)
    
    // Update URL with new difficulty
    router.push(`/sudoku?difficulty=${newDifficulty}`)
  }, [difficulty, router])

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
