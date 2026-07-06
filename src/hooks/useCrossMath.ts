'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Cell, Difficulty, CrossMathPuzzle } from '@/lib/crossmath/types'
import { getRandomPuzzle, getRandomPatternPuzzle } from '@/data/crossmath'
import { SCORING } from '@/lib/crossmath/constants'
import {
  isBoardComplete,
  getCorrectValue,
  validateBoard,
  findEmptyCell,
  calculateAvailableHints,
} from '@/lib/crossmath/helpers'
import {
  saveGameState,
  loadGameState,
  clearGameState,
} from '@/lib/crossmath/storage'
import { markPuzzleCompleted } from '@/lib/completion/universal'

export function useCrossMath() {
  const searchParams = useSearchParams()
  const difficultyParam = (searchParams.get('difficulty') || 'easy') as Difficulty
  // Pattern mode is disabled to load the exact hand-crafted layout shapes
  const usePatternMode = false
  
  const [difficulty, setDifficulty] = useState<Difficulty>(difficultyParam)
  const [board, setBoard] = useState<Cell[][]>([])
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null)
  const [mistakes, setMistakes] = useState(0)
  const [maxMistakes, setMaxMistakes] = useState(5)
  const [score, setScore] = useState(0)
  const [time, setTime] = useState(0)
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing')
  const [availableNumbers, setAvailableNumbers] = useState<Set<number>>(new Set())
  const [usedNumbersCount, setUsedNumbersCount] = useState<Map<number, number>>(new Map())
  const [currentPuzzle, setCurrentPuzzle] = useState<CrossMathPuzzle | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const [scoreFeedbacks, setScoreFeedbacks] = useState<Array<{
    id: string
    value: number
    timestamp: number
  }>>([])

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Derive required number counts from the solution — only for values shown in the number pad
  const requiredNumbersCount = useMemo(() => {
    if (!currentPuzzle) return new Map<number, number>()
    const counts = new Map<number, number>()
    const padSet = new Set(currentPuzzle.availableNumbers)
    Object.values(currentPuzzle.solution).forEach(val => {
      if (padSet.has(val)) {
        counts.set(val, (counts.get(val) || 0) + 1)
      }  
    })
    return counts
  }, [currentPuzzle])        

  // Initialize puzzle
  useEffect(() => {
    // Try to load saved game first
    const savedGame = loadGameState()
    
    if (savedGame && savedGame.difficulty === difficulty) {
      // Restore saved game
      setBoard(savedGame.board)
      setMistakes(savedGame.mistakes)
      setScore(savedGame.score)
      setTime(savedGame.time)
      setGameStatus(savedGame.gameStatus as 'playing' | 'won' | 'lost')
      setSelectedCell(null)
      setIsTyping(false)
      
      // Get puzzle to restore metadata
      const puzzle = usePatternMode ? getRandomPatternPuzzle(difficulty) : getRandomPuzzle(difficulty)
      setCurrentPuzzle(puzzle)
      setMaxMistakes(puzzle.maxMistakes)
      setAvailableNumbers(new Set(puzzle.availableNumbers))
      
      // Restore used numbers count
      const usedCount = new Map<number, number>()
      savedGame.board.forEach(row => {
        row.forEach(cell => {
          if (cell.isEditable && cell.type === 'number' && typeof cell.value === 'number') {
            const current = usedCount.get(cell.value) || 0
            usedCount.set(cell.value, current + 1)
          }
        })
      })
      setUsedNumbersCount(usedCount)
    } else {
      // Start new game
      const puzzle = usePatternMode ? getRandomPatternPuzzle(difficulty) : getRandomPuzzle(difficulty)
      const gridCopy = puzzle.grid.map(row => row.map(cell => ({ ...cell })))
      setBoard(gridCopy)
      setCurrentPuzzle(puzzle)
      setMaxMistakes(puzzle.maxMistakes)
      setAvailableNumbers(new Set(puzzle.availableNumbers))
      setUsedNumbersCount(new Map())
      setMistakes(0)
      setScore(0)
      setTime(0)
      setGameStatus('playing')
      setSelectedCell(null)
      setIsTyping(false)
      clearGameState()
    }
  }, [difficulty, usePatternMode])

  // Save game state whenever it changes
  useEffect(() => {
    if (gameStatus === 'playing' && board.length > 0 && currentPuzzle) {
      saveGameState({
        board,
        puzzleId: currentPuzzle.id,
        difficulty,
        mistakes,
        score,
        time,
        gameStatus,
      })
    }
  }, [board, difficulty, mistakes, score, time, gameStatus, currentPuzzle])

  // Timer
  useEffect(() => {
    if (gameStatus === 'playing') {
      timerRef.current = setInterval(() => {
        setTime(prev => prev + 1)
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [gameStatus])

  // Update difficulty from URL
  useEffect(() => {
    if (difficultyParam !== difficulty) {
      setDifficulty(difficultyParam)
    }
  }, [difficultyParam, difficulty])

  const triggerScoreFeedback = (value: number) => {
    const feedback = {
      id: `${Date.now()}-${Math.random()}`,
      value,
      timestamp: Date.now(),
    }
    setScoreFeedbacks(prev => [...prev, feedback])
  }

  const handleFeedbackComplete = useCallback((id: string) => {
    setScoreFeedbacks(prev => prev.filter(f => f.id !== id))
  }, [])

  const enterNumber = useCallback((num: number) => {
    if (!selectedCell || gameStatus !== 'playing' || !currentPuzzle) return

    const { row, col } = selectedCell
    const cell = board[row][col]

    if (!cell.isEditable) return

    setIsTyping(false)

    const newBoard = board.map(r => r.map(c => ({ ...c })))
    
    // Get correct value from solution
    const correctValue = getCorrectValue(currentPuzzle.solution, row, col)
    const isCorrect = correctValue !== null && num === correctValue

    // Update cell
    newBoard[row][col] = {
      ...cell,
      type: 'number',
      value: num,
      isCorrect: isCorrect,
      isError: !isCorrect,
    }

    setBoard(newBoard)

    // Track number usage count
    const newUsedCount = new Map(usedNumbersCount)
    
    // Overwriting check: decrement previous numeric value count if valid
    if (cell.type === 'number' && typeof cell.value === 'number') {
      const prevCount = newUsedCount.get(cell.value) || 0
      if (prevCount > 0) {
        newUsedCount.set(cell.value, prevCount - 1)
      }
    }

    const currentCount = newUsedCount.get(num) || 0
    newUsedCount.set(num, currentCount + 1)
    setUsedNumbersCount(newUsedCount)

    // Update score with feedback
    if (isCorrect) {
      const newScore = score + SCORING.CORRECT_ANSWER
      setScore(newScore)
      triggerScoreFeedback(SCORING.CORRECT_ANSWER)
    } else {
      const newScore = Math.max(0, score + SCORING.WRONG_ANSWER)
      setScore(newScore)
      triggerScoreFeedback(SCORING.WRONG_ANSWER)
      
      const newMistakes = mistakes + 1
      setMistakes(newMistakes)
      
      // Check game over
      if (newMistakes >= maxMistakes) {
        setGameStatus('lost')
        clearGameState()
        return
      }
    }

    // Check win condition
    if (isBoardComplete(newBoard) && validateBoard(newBoard, currentPuzzle.solution)) {
      // Mark puzzle as completed in universal completion system
      const dateParam = searchParams.get('date')
      // Convert date to full puzzle ID format: daily-cross-math-MM-DD-YY
      const puzzleId = dateParam ? `daily-cross-math-${dateParam}` : currentPuzzle.id
      markPuzzleCompleted('crossmath', puzzleId, {
        time: time,
        score: score,
        difficulty: difficulty,
      })
      
      setGameStatus('won')
      clearGameState()
    }
  }, [selectedCell, board, gameStatus, usedNumbersCount, score, mistakes, maxMistakes, currentPuzzle, time, difficulty, searchParams])

  const commitCurrentInput = useCallback(() => {
    if (!selectedCell || gameStatus !== 'playing' || !currentPuzzle || !isTyping) return

    const { row, col } = selectedCell
    const cell = board[row][col]
    if (!cell.isEditable) return

    const valStr = cell.value !== undefined ? String(cell.value) : ''
    const num = parseInt(valStr, 10)

    // If it's not a valid number (e.g. just "-"), we treat it as empty
    if (isNaN(num)) {
      const newBoard = board.map(r => r.map(c => ({ ...c })))
      newBoard[row][col] = {
        ...cell,
        type: 'empty',
        value: undefined,
        isCorrect: undefined,
        isError: undefined,
      }
      setBoard(newBoard)
      setIsTyping(false)
      return
    }

    setIsTyping(false)

    // Validate it
    const correctValue = getCorrectValue(currentPuzzle.solution, row, col)
    const isCorrect = correctValue !== null && num === correctValue

    const newBoard = board.map(r => r.map(c => ({ ...c })))
    newBoard[row][col] = {
      ...cell,
      type: 'number',
      value: num,
      isCorrect: isCorrect,
      isError: !isCorrect,
    }

    setBoard(newBoard)

    // Track number usage count
    const newUsedCount = new Map(usedNumbersCount)
    const currentCount = newUsedCount.get(num) || 0
    newUsedCount.set(num, currentCount + 1)
    setUsedNumbersCount(newUsedCount)

    // Update score and mistakes
    if (isCorrect) {
      const newScore = score + SCORING.CORRECT_ANSWER
      setScore(newScore)
      triggerScoreFeedback(SCORING.CORRECT_ANSWER)
    } else {
      const newScore = Math.max(0, score + SCORING.WRONG_ANSWER)
      setScore(newScore)
      triggerScoreFeedback(SCORING.WRONG_ANSWER)
      
      const newMistakes = mistakes + 1
      setMistakes(newMistakes)
      
      if (newMistakes >= maxMistakes) {
        setGameStatus('lost')
        clearGameState()
        return
      }
    }

    // Check win condition
    if (isBoardComplete(newBoard) && validateBoard(newBoard, currentPuzzle.solution)) {
      // Mark puzzle as completed in universal completion system
      const dateParam = searchParams.get('date')
      // Convert date to full puzzle ID format: daily-cross-math-MM-DD-YY
      const puzzleId = dateParam ? `daily-cross-math-${dateParam}` : currentPuzzle.id
      markPuzzleCompleted('crossmath', puzzleId, {
        time: time,
        score: score,
        difficulty: difficulty,
      })
      
      setGameStatus('won')
      clearGameState()
    }
  }, [selectedCell, board, gameStatus, currentPuzzle, isTyping, usedNumbersCount, score, mistakes, maxMistakes, time, difficulty, searchParams])

  const selectCell = useCallback((row: number, col: number) => {
    const cell = board[row]?.[col]
    if (!cell || !cell.isEditable) return

    // If we were typing in another cell, commit it first!
    if (isTyping && selectedCell && (selectedCell.row !== row || selectedCell.col !== col)) {
      commitCurrentInput()
    }

    setSelectedCell({ row, col })
    setIsTyping(false)
  }, [board, isTyping, selectedCell, commitCurrentInput])

  const eraseCell = useCallback(() => {
    if (!selectedCell || gameStatus !== 'playing') return

    const { row, col } = selectedCell
    const cell = board[row][col]

    if (!cell.isEditable || cell.type === 'empty') return

    // Return number to unused pool - decrement usage count
    if (typeof cell.value === 'number') {
      const newUsedCount = new Map(usedNumbersCount)
      const currentCount = newUsedCount.get(cell.value) || 0
      if (currentCount > 0) {
        newUsedCount.set(cell.value, currentCount - 1)
      }
      setUsedNumbersCount(newUsedCount)
    }

    const newBoard = board.map(r => r.map(c => ({ ...c })))
    newBoard[row][col] = {
      ...cell,
      type: 'empty',
      value: undefined,
      isCorrect: undefined,
      isError: undefined,
    }

    setBoard(newBoard)
    setIsTyping(false)
  }, [selectedCell, board, gameStatus, usedNumbersCount])

  const resetBoard = useCallback(() => {
    const puzzle = usePatternMode ? getRandomPatternPuzzle(difficulty) : getRandomPuzzle(difficulty)
    const gridCopy = puzzle.grid.map(row => row.map(cell => ({ ...cell })))
    setBoard(gridCopy)
    setCurrentPuzzle(puzzle)
    setMaxMistakes(puzzle.maxMistakes)
    setAvailableNumbers(new Set(puzzle.availableNumbers))
    setUsedNumbersCount(new Map())
    setMistakes(0)
    setScore(0)
    setTime(0)
    setGameStatus('playing')
    setSelectedCell(null)
    setIsTyping(false)
    clearGameState()
  }, [difficulty, usePatternMode])

  const requestHint = useCallback(() => {
    if (gameStatus !== 'playing' || !currentPuzzle) return

    const availableHints = calculateAvailableHints(score)
    if (availableHints <= 0) return

    // Find empty cell to hint
    const emptyCell = findEmptyCell(board)
    if (!emptyCell) return

    const { row, col } = emptyCell
    const correctValue = getCorrectValue(currentPuzzle.solution, row, col)
    if (correctValue === null) return

    setIsTyping(false)

    // Apply hint
    const newBoard = board.map(r => r.map(c => ({ ...c })))
    newBoard[row][col] = {
      ...newBoard[row][col],
      type: 'number',
      value: correctValue,
      isCorrect: true,
      isError: false,
    }

    setBoard(newBoard)

    // Track number usage
    const newUsedCount = new Map(usedNumbersCount)
    const currentCount = newUsedCount.get(correctValue) || 0
    newUsedCount.set(correctValue, currentCount + 1)
    setUsedNumbersCount(newUsedCount)

    // Deduct hint cost
    const newScore = Math.max(0, score + SCORING.HINT_COST)
    setScore(newScore)
    triggerScoreFeedback(SCORING.HINT_COST)

    // Select the hinted cell
    setSelectedCell({ row, col })

    // Check win condition
    if (isBoardComplete(newBoard) && validateBoard(newBoard, currentPuzzle.solution)) {
      // Mark puzzle as completed in universal completion system
      const dateParam = searchParams.get('date')
      // Convert date to full puzzle ID format: daily-cross-math-MM-DD-YY
      const puzzleId = dateParam ? `daily-cross-math-${dateParam}` : currentPuzzle.id
      markPuzzleCompleted('crossmath', puzzleId, {
        time: time,
        score: newScore,
        difficulty: difficulty,
      })
      
      setGameStatus('won')
      clearGameState()
    }
  }, [board, gameStatus, score, usedNumbersCount, currentPuzzle, time, difficulty, searchParams])

  const handleKeyboardInput = useCallback((key: string) => {
    if (!selectedCell || gameStatus !== 'playing' || !currentPuzzle) return

    const { row, col } = selectedCell
    const cell = board[row][col]
    if (!cell.isEditable) return

    let newValueStr = ''
    const newUsedCount = new Map(usedNumbersCount)

    if (!isTyping) {
      newValueStr = key
      setIsTyping(true)

      // If overwriting a number, decrement its usage count
      if (cell.type === 'number' && typeof cell.value === 'number') {
        const prevCount = newUsedCount.get(cell.value) || 0
        if (prevCount > 0) {
          newUsedCount.set(cell.value, prevCount - 1)
        }
        setUsedNumbersCount(newUsedCount)
      }
    } else {
      const currentVal = cell.value !== undefined ? String(cell.value) : ''
      if (key === '-' && currentVal !== '') return
      newValueStr = currentVal + key
    }

    // Limit length: max 2 digits (+ optional minus sign)
    const isNegative = newValueStr.startsWith('-')
    const maxLen = isNegative ? 3 : 2
    if (newValueStr.length > maxLen) return

    // Special case: just a minus sign is not a valid number yet
    if (newValueStr === '-') {
      const newBoard = board.map(r => r.map(c => ({ ...c })))
      newBoard[row][col] = {
        ...cell,
        value: newValueStr,
        isCorrect: undefined,
        isError: undefined,
      }
      setBoard(newBoard)
      return
    }

    const num = parseInt(newValueStr, 10)
    if (isNaN(num)) return

    const correctValue = getCorrectValue(currentPuzzle.solution, row, col)
    const isCorrect = correctValue !== null && num === correctValue

    // Auto-commit if correct OR if maximum length is reached
    if (isCorrect || newValueStr.length === maxLen) {
      setIsTyping(false)

      const newBoard = board.map(r => r.map(c => ({ ...c })))
      newBoard[row][col] = {
        ...cell,
        type: 'number',
        value: num,
        isCorrect: isCorrect,
        isError: !isCorrect,
      }
      setBoard(newBoard)

      // Track usage count
      const updatedUsedCount = new Map(usedNumbersCount)
      const currentCount = updatedUsedCount.get(num) || 0
      updatedUsedCount.set(num, currentCount + 1)
      setUsedNumbersCount(updatedUsedCount)

      // Score / Mistakes
      if (isCorrect) {
        const newScore = score + SCORING.CORRECT_ANSWER
        setScore(newScore)
        triggerScoreFeedback(SCORING.CORRECT_ANSWER)
      } else {
        const newScore = Math.max(0, score + SCORING.WRONG_ANSWER)
        setScore(newScore)
        triggerScoreFeedback(SCORING.WRONG_ANSWER)

        const newMistakes = mistakes + 1
        setMistakes(newMistakes)

        if (newMistakes >= maxMistakes) {
          setGameStatus('lost')
          clearGameState()
          return
        }
      }

      // Check win condition
      if (isBoardComplete(newBoard) && validateBoard(newBoard, currentPuzzle.solution)) {
        // Mark puzzle as completed in universal completion system
        const dateParam = searchParams.get('date')
        // Convert date to full puzzle ID format: daily-cross-math-MM-DD-YY
        const puzzleId = dateParam ? `daily-cross-math-${dateParam}` : currentPuzzle.id
        markPuzzleCompleted('crossmath', puzzleId, {
          time: time,
          score: isCorrect ? score + SCORING.CORRECT_ANSWER : Math.max(0, score + SCORING.WRONG_ANSWER),
          difficulty: difficulty,
        })
        
        setGameStatus('won')
        clearGameState()
      }
    } else {
      // Just keep typing
      const newBoard = board.map(r => r.map(c => ({ ...c })))
      newBoard[row][col] = {
        ...cell,
        value: newValueStr,
        isCorrect: undefined,
        isError: undefined,
      }
      setBoard(newBoard)
    }
  }, [board, selectedCell, gameStatus, isTyping, usedNumbersCount, score, mistakes, maxMistakes, currentPuzzle])

  // Keyboard support with multi-digit and minus support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStatus !== 'playing' || !selectedCell) return

      // Numbers and minus sign
      if (/^[0-9]$/.test(e.key) || e.key === '-') {
        e.preventDefault()
        handleKeyboardInput(e.key)
        return
      }

      // Enter key to commit
      if (e.key === 'Enter') {
        e.preventDefault()
        commitCurrentInput()
        return
      }

      // Delete/Backspace
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault()
        if (isTyping && selectedCell) {
          const { row, col } = selectedCell
          const cell = board[row][col]
          const currentVal = cell.value !== undefined ? String(cell.value) : ''
          if (currentVal.length > 0) {
            const newValStr = currentVal.slice(0, -1)
            const newBoard = board.map(r => r.map(c => ({ ...c })))
            newBoard[row][col] = {
              ...cell,
              value: newValStr !== '' ? newValStr : undefined,
              isCorrect: undefined,
              isError: undefined,
            }
            setBoard(newBoard)
            if (newValStr === '') {
              setIsTyping(false)
            }
            return
          }
        }
        eraseCell()
        setIsTyping(false)
        return
      }

      // Arrow keys
      if (e.key.startsWith('Arrow') && selectedCell) {
        e.preventDefault()
        
        // Commit draft if typing
        if (isTyping) {
          commitCurrentInput()
        }

        const { row, col } = selectedCell
        let newRow = row
        let newCol = col

        switch (e.key) {
          case 'ArrowUp':
            newRow = Math.max(0, row - 1)
            break
          case 'ArrowDown':
            newRow = Math.min(board.length - 1, row + 1)
            break
          case 'ArrowLeft':
            newCol = Math.max(0, col - 1)
            break
          case 'ArrowRight':
            newCol = Math.min(board[0].length - 1, col + 1)
            break
        }

        while (
          (newRow !== row || newCol !== col) &&
          !board[newRow]?.[newCol]?.isEditable
        ) {
          if (e.key === 'ArrowUp' && newRow > 0) newRow--
          else if (e.key === 'ArrowDown' && newRow < board.length - 1) newRow++
          else if (e.key === 'ArrowLeft' && newCol > 0) newCol--
          else if (e.key === 'ArrowRight' && newCol < board[0].length - 1) newCol++
          else break
        }

        if (board[newRow]?.[newCol]?.isEditable) {
          selectCell(newRow, newCol)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedCell, gameStatus, eraseCell, selectCell, board, isTyping, handleKeyboardInput, commitCurrentInput])

  return {
    board,
    selectedCell,
    mistakes,
    maxMistakes,
    score,
    time,
    gameStatus,
    difficulty,
    availableNumbers,
    usedNumbersCount,
    requiredNumbersCount,
    scoreFeedbacks,
    selectCell,
    enterNumber,
    eraseCell,
    resetBoard,
    requestHint,
    availableHints: calculateAvailableHints(score),
    handleFeedbackComplete,
  }
}
