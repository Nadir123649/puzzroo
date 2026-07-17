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
import { useRouter, useSearchParams } from 'next/navigation'
import { SudokuBoard, Position, GameStatus, Difficulty } from '@shared/lib/sudoku/types'
import { getRandomPuzzle, puzzleDataset } from '@shared/data/sudoku'
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
  getCorrectValue,
  calculateAvailableHints,
  convertToSudokuBoard,
  isValidMove,
  isValidCompletedBoard,
} from '@shared/lib/sudoku/helpers'
import { KEYBOARD_KEYS, INITIAL_GAME_STATE } from '@shared/lib/sudoku/constants'
import {
  saveGameState,
  loadGameState,
  clearGameState,
  saveDifficultyPreference,
  loadDifficultyPreference,
} from '@shared/lib/sudoku/storage'
import { markPuzzleCompleted } from '@shared/lib/completion/universal'

function getDailySudokuPuzzle(date: Date, diff: Difficulty) {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
  const pool = puzzleDataset[diff as 'easy' | 'medium' | 'hard'] || puzzleDataset['easy']
  const x = Math.sin(seed) * 10000
  const rand = x - Math.floor(x)
  const index = Math.floor(rand * pool.length)
  return pool[index]
}

export function useSudoku() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlDifficulty = (searchParams.get('difficulty') || 'easy') as Difficulty
  
  // Check if this is from daily challenge
  const dateParam = searchParams.get('date')
  const isDailyChallenge = !!dateParam || (typeof window !== 'undefined' && window.location.pathname.includes('/daily-challenge/'))
  
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

    // Load new puzzle
    let puzzle
    if (isDailyChallenge) {
      let dailyDate = new Date()
      if (dateParam) {
        const [month, day, year] = dateParam.split('-')
        const fullYear = 2000 + parseInt(year)
        dailyDate = new Date(fullYear, parseInt(month) - 1, parseInt(day))
      }
      puzzle = getDailySudokuPuzzle(dailyDate, diff)
    } else {
      puzzle = getRandomPuzzle(diff)
    }

    const currentBoard = convertToSudokuBoard(puzzle.puzzle)
    const initialBoard = cloneBoard(currentBoard)
    const solution = convertToSudokuBoard(puzzle.solution)

    return {
      currentBoard,
      initialBoard,
      solution,
      puzzleId: isDailyChallenge && dateParam ? `daily-sudoku-${dateParam}` : puzzle.id,
      mistakes: 0,
      score: 0,
      time: 0,
      gameStatus: 'playing' as GameStatus,
    }
  }, [isDailyChallenge, dateParam])

  const [gameState, setGameState] = useState(() => {
    // Fallback initializer for initial server render
    return initializeGame('easy', false)
  })
  
  // Sync with URL difficulty on mount/change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const valid = ['easy', 'medium', 'hard', 'expert']
      const currentDiff = valid.includes(urlDifficulty) ? urlDifficulty : 'easy'
      
      setDifficulty(currentDiff)
      saveDifficultyPreference(currentDiff)
      
      setGameState((prev) => {
        // Only re-initialize if the loaded game is for a different difficulty
        if (isInitialized && prev.puzzleId && prev.currentBoard.length > 0) {
          const saved = loadGameState()
          if (saved && saved.difficulty === currentDiff) {
            return saved
          }
        }

        // Try to load saved game first
        const saved = loadGameState()
        if (saved && saved.difficulty === currentDiff) {
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
        
        // Start fresh
        let puzzle
        if (isDailyChallenge) {
          let dailyDate = new Date()
          if (dateParam) {
            const [month, day, year] = dateParam.split('-')
            const fullYear = 2000 + parseInt(year)
            dailyDate = new Date(fullYear, parseInt(month) - 1, parseInt(day))
          }
          puzzle = getDailySudokuPuzzle(dailyDate, currentDiff)
        } else {
          puzzle = getRandomPuzzle(currentDiff)
        }
        
        const currentBoard = convertToSudokuBoard(puzzle.puzzle)
        const initialBoard = cloneBoard(currentBoard)
        const solution = convertToSudokuBoard(puzzle.solution)
        return {
          currentBoard,
          initialBoard,
          solution,
          puzzleId: isDailyChallenge && dateParam ? `daily-sudoku-${dateParam}` : puzzle.id,
          mistakes: 0,
          score: 0,
          time: 0,
          gameStatus: 'playing' as GameStatus,
        }
      })
      
      setIsInitialized(true)
    }
  }, [urlDifficulty])
  
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
    if (isInitialized && gameState.gameStatus === 'playing') {
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
  }, [gameState, difficulty, isInitialized])

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

      // Validate based on Sudoku rules
      if (!isValid) {
        // Invalid move - violates Sudoku rules (duplicate in row/column/box)
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
      } else {
        // Valid move - follows Sudoku rules
        newBoard[selectedCell.row][selectedCell.col].isError = false
        newBoard[selectedCell.row][selectedCell.col].isCorrect = true
        updateScore(10) // +10 for correct answer
        
        setGameState((prev) => ({ ...prev, currentBoard: newBoard }))

        // Check for win - validate entire board using Sudoku rules
        if (isBoardComplete(newBoard) && isValidCompletedBoard(newBoard)) {
          setIsWinAnimating(true)
          
          // Mark puzzle as completed in universal completion system
          const dateParam = searchParams.get('date')
          const puzzleId = dateParam ? `daily-sudoku-${dateParam}` : gameState.puzzleId
          markPuzzleCompleted('sudoku', puzzleId, {
            time: gameState.time,
            score: gameState.score + 10,
            difficulty: difficulty,
          })
          
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
    
    setGameState((prev) => ({ ...prev, currentBoard: newBoard }))
  }, [selectedCell, gameState])

  /**
   * Use hint - applies to selected cell, or random cell if none selected
   */
  const requestHint = useCallback(() => {
    if (gameState.gameStatus !== 'playing') return

    const availableHints = calculateAvailableHints(gameState.score)
    if (availableHints <= 0) return

    // Helper: check if placing `value` at position conflicts with existing board values
    const conflictsWithBoard = (board: typeof gameState.currentBoard, pos: Position, value: number): boolean => {
      const { row, col } = pos
      // Check row
      for (let c = 0; c < 9; c++) {
        if (c !== col && board[row][c].value === value) return true
      }
      // Check col
      for (let r = 0; r < 9; r++) {
        if (r !== row && board[r][col].value === value) return true
      }
      // Check 3x3 box
      const boxRow = Math.floor(row / 3) * 3
      const boxCol = Math.floor(col / 3) * 3
      for (let r = boxRow; r < boxRow + 3; r++) {
        for (let c = boxCol; c < boxCol + 3; c++) {
          if ((r !== row || c !== col) && board[r][c].value === value) return true
        }
      }
      return false
    }

    // Find best target cell — prefer selected cell if it's empty or has an error
    let targetCell: Position | null = null

    if (selectedCell) {
      const cell = getCellAt(gameState.currentBoard, selectedCell)
      // Allow hinting on empty cells OR cells with errors (wrong values)
      if (cell && !cell.fixed && (!cell.value || cell.isError)) {
        const correctValue = getCorrectValue(gameState.solution, selectedCell)
        if (correctValue && !conflictsWithBoard(gameState.currentBoard, selectedCell, correctValue)) {
          targetCell = selectedCell
        }
      }
    }

    // Fall back to finding any empty/error cell whose correct value doesn't conflict
    if (!targetCell) {
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          const cell = gameState.currentBoard[row][col]
          if (!cell.fixed && (!cell.value || cell.isError)) {
            const pos = { row, col }
            const correctValue = getCorrectValue(gameState.solution, pos)
            if (correctValue && !conflictsWithBoard(gameState.currentBoard, pos, correctValue)) {
              targetCell = pos
              break
            }
          }
        }
        if (targetCell) break
      }
    }

    // No valid cell available
    if (!targetCell) return

    const correctValue = getCorrectValue(gameState.solution, targetCell)
    if (!correctValue) return

    let newBoard = updateCellValue(gameState.currentBoard, targetCell, correctValue)
    newBoard[targetCell.row][targetCell.col] = clearNotes(
      newBoard[targetCell.row][targetCell.col]
    )
    // Mark as correct and clear any error
    newBoard[targetCell.row][targetCell.col].isCorrect = true
    newBoard[targetCell.row][targetCell.col].isError = false

    updateScore(-20) // -20 for hint
    setGameState((prev) => ({ ...prev, currentBoard: newBoard }))

    // Check for win - validate entire board using Sudoku rules
    if (isBoardComplete(newBoard) && isValidCompletedBoard(newBoard)) {
      setIsWinAnimating(true)
      
      // Mark puzzle as completed in universal completion system
      const dateParam = searchParams.get('date')
      // Convert date to full puzzle ID format: daily-sudoku-MM-DD-YY
      const puzzleId = dateParam ? `daily-sudoku-${dateParam}` : gameState.puzzleId
      markPuzzleCompleted('sudoku', puzzleId, {
        time: gameState.time,
        score: gameState.score - 20,
        difficulty: difficulty,
      })
      
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
    setDifficulty(newDifficulty)
    saveDifficultyPreference(newDifficulty)
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
        e.preventDefault() // Prevent any default input behavior
        const num = parseInt(e.key, 10)
        if (num >= 1 && num <= 9) { // Only accept 1-9, not 0
          enterNumber(num)
        }
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
