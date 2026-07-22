'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Cell, Difficulty, CrossMathPuzzle } from '@shared/lib/crossmath/types'
import {
  getRandomPuzzle,
  getRandomPatternPuzzle,
  getDailyPatternPuzzle,
  getPuzzleById,
} from '@shared/data/crossmath'
import { gameApi } from '@/lib/api/gameApi'
import { SCORING } from '@shared/lib/crossmath/constants'
import {
  isBoardComplete,
  getCorrectValue,
  validateBoard,
  findEmptyCell,
  calculateAvailableHints,
} from '@shared/lib/crossmath/helpers'
import {
  saveGameState,
  loadGameState,
  clearGameState,
} from '@shared/lib/crossmath/storage'
import { markPuzzleCompleted } from '@shared/lib/completion/universal'

const PUZZLE_CACHE_KEY = 'puzzroo_crossmath_cache_by_id'

function getDailyDate(dateParam?: string | null): Date {
  if (dateParam) {
    const [month, day, year] = dateParam.split('-')
    const fullYear = 2000 + parseInt(year)
    return new Date(fullYear, parseInt(month) - 1, parseInt(day))
  }
  return new Date()
}

function getDailyDateString(dateParam?: string | null): string {
  const d = getDailyDate(dateParam)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

function getDailyCrossMathPuzzle(date: Date, diff: Difficulty): CrossMathPuzzle {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
  return getDailyPatternPuzzle(diff, seed)
}

function readPuzzleCache(id: string): CrossMathPuzzle | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(PUZZLE_CACHE_KEY)
    if (!raw) return null
    const map = JSON.parse(raw) as Record<string, CrossMathPuzzle>
    return map[id] || null
  } catch {
    return null
  }
}

function writePuzzleCache(puzzle: CrossMathPuzzle): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(PUZZLE_CACHE_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, CrossMathPuzzle>) : {}
    map[puzzle.id] = puzzle
    localStorage.setItem(PUZZLE_CACHE_KEY, JSON.stringify(map))
  } catch {
    // ignore cache write failures
  }
}

async function reportWin(
  puzzleId: string,
  difficulty: Difficulty,
  score: number,
  time: number,
  mistakes: number
): Promise<void> {
  if (typeof window !== 'undefined' && localStorage.getItem('accessToken')) {
    try {
      await gameApi.complete('crossmath', {
        puzzleId,
        difficulty,
        score,
        time,
        mistakes,
      })
    } catch {
      // fire-and-forget; ignore failures
    }
  }
}

export function useCrossMath(initialPuzzleId?: string) {
  const searchParams = useSearchParams()
  const urlPuzzleId = searchParams.get('puzzleId')
  const puzzleId = initialPuzzleId || urlPuzzleId || undefined
  const difficultyParam = (searchParams.get('difficulty') || 'easy') as Difficulty
  const usePatternMode = true
  
  const dateParam = searchParams.get('date')
  const isDailyChallenge = !!dateParam || (typeof window !== 'undefined' && window.location.pathname.includes('/daily-challenge/'))
  
  const getInitialTime = (diff: Difficulty) => {
    switch (diff) {
      case 'hard': return 600
      case 'medium': return 420
      default: return 300
    }
  }

  const getInitialDifficulty = () => {
    if (typeof window !== 'undefined') {
      const saved = loadGameState()
      if (saved && saved.difficulty) {
        return saved.difficulty
      }
    }
    return difficultyParam
  }

  const [difficulty, setDifficulty] = useState<Difficulty>(getInitialDifficulty)
  const [board, setBoard] = useState<Cell[][]>([])
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null)
  const [mistakes, setMistakes] = useState(0)
  const [maxMistakes, setMaxMistakes] = useState(5)
  const [score, setScore] = useState(0)
  const [time, setTime] = useState(() => getInitialTime(getInitialDifficulty()))
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
  const [loading, setLoading] = useState(false)
  
  const [history, setHistory] = useState<any[]>([])

  const pushToHistory = useCallback((
    position: { row: number; col: number },
    previousValue: number | string | undefined,
    previousType: Cell['type'],
    previousIsCorrect: boolean | undefined,
    previousIsError: boolean | undefined
  ) => {
    setHistory(prev => [
      ...prev,
      {
        position,
        previousValue,
        previousType,
        previousIsCorrect,
        previousIsError,
      }
    ])
  }, [])

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const requiredNumbersCount = useMemo(() => {
    if (!currentPuzzle || !currentPuzzle.solution) return new Map<number, number>()
    const counts = new Map<number, number>()
    const padSet = new Set(currentPuzzle.availableNumbers)
    Object.values(currentPuzzle.solution).forEach(val => {
      if (padSet.has(val)) {
        counts.set(val, (counts.get(val) || 0) + 1)
      }  
    })
    return counts
  }, [currentPuzzle])        

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const savedGame = loadGameState()

        let puzzle: CrossMathPuzzle | null = null

        // If puzzleId is specified, load that specific puzzle
        if (puzzleId) {
          const cached = readPuzzleCache(puzzleId)
          if (cached) {
            puzzle = cached
          } else {
            try {
              puzzle = await gameApi.getPuzzleById('crossmath', puzzleId) as unknown as CrossMathPuzzle
              if (puzzle) writePuzzleCache(puzzle)
            } catch {
              puzzle = getPuzzleById(puzzleId) || null
            }
          }
        }

        // Fall back to saved game or random puzzle
        if (!puzzle) {
          if (savedGame && savedGame.difficulty === difficulty) {
            const resumeId = savedGame.puzzleId
            try {
              puzzle = isDailyChallenge
                ? (await gameApi.getDailyPuzzle('crossmath', getDailyDateString(dateParam))) as CrossMathPuzzle
                : (readPuzzleCache(resumeId) || (await gameApi.getPuzzleById('crossmath', resumeId)) as CrossMathPuzzle)
            } catch {
              puzzle = isDailyChallenge
                ? getDailyCrossMathPuzzle(getDailyDate(dateParam), difficulty)
                : (getPuzzleById(resumeId) ||
                    (usePatternMode ? getRandomPatternPuzzle(difficulty) : getRandomPuzzle(difficulty)))
            }
          } else {
            try {
              puzzle = isDailyChallenge
                ? (await gameApi.getDailyPuzzle('crossmath', getDailyDateString(dateParam))) as CrossMathPuzzle
                : (await gameApi.getPuzzle('crossmath', { difficulty })) as CrossMathPuzzle
            } catch {
              puzzle = isDailyChallenge
                ? getDailyCrossMathPuzzle(getDailyDate(dateParam), difficulty)
                : (usePatternMode ? getRandomPatternPuzzle(difficulty) : getRandomPuzzle(difficulty))
            }
          }
        }

        if (cancelled || !puzzle) return
        writePuzzleCache(puzzle)

        if (savedGame && savedGame.difficulty === difficulty && !puzzleId) {
          setBoard(savedGame.board)
          setMistakes(savedGame.mistakes)
          setScore(savedGame.score)
          setTime(savedGame.time)
          setGameStatus(savedGame.gameStatus as 'playing' | 'won' | 'lost')
          setSelectedCell(null)
          setIsTyping(false)

          setCurrentPuzzle(puzzle)
          const limit = difficulty === 'hard' ? 2 : puzzle.maxMistakes
          setMaxMistakes(limit)
          setAvailableNumbers(new Set(puzzle.availableNumbers))

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
          const gridCopy = puzzle.grid.map(row => row.map(cell => ({ ...cell })))
          setBoard(gridCopy)
          setCurrentPuzzle(puzzle)
          const limit = difficulty === 'hard' ? 2 : puzzle.maxMistakes
          setMaxMistakes(limit)
          setAvailableNumbers(new Set(puzzle.availableNumbers))
          setUsedNumbersCount(new Map())
          setMistakes(0)
          setScore(0)
          setTime(getInitialTime(difficulty))
          setGameStatus('playing')
          setSelectedCell(null)
          setIsTyping(false)
          setHistory([])
          clearGameState()
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [difficulty, usePatternMode, isDailyChallenge, dateParam, puzzleId])

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
        setTime(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!)
            setGameStatus('lost')
            setSelectedCell(null)
            clearGameState()
            return 0
          }
          return prev - 1
        })
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

    // Protection: If cell is already correctly filled, ignore re-filling and re-scoring
    if (cell.type === 'number' && cell.isCorrect && cell.value === num) {
      return
    }

    // Prevent entering a number if it is already used up elsewhere
    const usedCount = usedNumbersCount.get(num) || 0
    const requiredCount = requiredNumbersCount.get(num) || 0
    const isOverwritingSelf = cell.type === 'number' && cell.value === num
    const adjustedUsedCount = isOverwritingSelf ? usedCount - 1 : usedCount
    
    if (adjustedUsedCount >= requiredCount) {
      return
    }

    setIsTyping(false)
    
    // Save move in history stack for undo
    pushToHistory(
      { row, col },
      typeof cell.value === 'number' ? cell.value : undefined,
      cell.type,
      cell.isCorrect,
      cell.isError
    )

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
        setSelectedCell(null)
        clearGameState()
        return
      }
    }

    // Check win condition
    if (isBoardComplete(newBoard) && validateBoard(newBoard, currentPuzzle.solution)) {
      // Mark puzzle as completed in universal completion system
      const dateParam = searchParams.get('date')
      const puzzleId = dateParam ? `daily-cross-math-${dateParam}` : currentPuzzle.id
      markPuzzleCompleted('crossmath', puzzleId, {
        time: time,
        score: score,
        difficulty: difficulty,
      })
      reportWin(puzzleId, difficulty, score, time, mistakes)
      
      // Clear selection on win
      setSelectedCell(null)
      setIsTyping(false)
      setGameStatus('won')
      clearGameState()
    }
  }, [selectedCell, board, gameStatus, usedNumbersCount, score, mistakes, maxMistakes, currentPuzzle, time, difficulty, searchParams, pushToHistory])

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
        setSelectedCell(null)
        clearGameState()
        return
      }
    }

    // Check win condition
    if (isBoardComplete(newBoard) && validateBoard(newBoard, currentPuzzle.solution)) {
      // Mark puzzle as completed in universal completion system
      const dateParam = searchParams.get('date')
      const puzzleId = dateParam ? `daily-cross-math-${dateParam}` : currentPuzzle.id
      markPuzzleCompleted('crossmath', puzzleId, {
        time: time,
        score: score,
        difficulty: difficulty,
      })
      reportWin(puzzleId, difficulty, score, time, mistakes)
      
      // Clear selection on win
      setSelectedCell(null)
      setIsTyping(false)
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

    if (!cell.isEditable || (cell.type === 'empty' && cell.value === undefined)) return
    
    // Save last move for undo
    pushToHistory(
      { row, col },
      typeof cell.value === 'number' ? cell.value : undefined,
      cell.type,
      cell.isCorrect,
      cell.isError
    )

    // Return number to unused pool - decrement usage count
    const numVal = typeof cell.value === 'number' ? cell.value : (typeof cell.value === 'string' ? parseInt(cell.value, 10) : NaN)
    if (!isNaN(numVal)) {
      const newUsedCount = new Map(usedNumbersCount)
      const currentCount = newUsedCount.get(numVal) || 0
      if (currentCount > 0) {
        newUsedCount.set(numVal, currentCount - 1)
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
  }, [selectedCell, board, gameStatus, usedNumbersCount, pushToHistory])
  
  const undoLastMove = useCallback(() => {
    if (history.length === 0 || gameStatus !== 'playing') return
    
    const lastMove = history[history.length - 1]
    const { position, previousValue, previousType, previousIsCorrect, previousIsError } = lastMove
    const { row, col } = position
    
    const newBoard = board.map(r => r.map(c => ({ ...c })))
    const cell = newBoard[row][col]
    
    // Update number usage count
    const newUsedCount = new Map(usedNumbersCount)
    
    // Remove current value from count
    if (cell.type === 'number' && typeof cell.value === 'number') {
      const currentCount = newUsedCount.get(cell.value) || 0
      if (currentCount > 0) {
        newUsedCount.set(cell.value, currentCount - 1)
      }
    }
    
    // Add previous value to count if it was a number
    if (previousType === 'number' && typeof previousValue === 'number') {
      const prevCount = newUsedCount.get(previousValue) || 0
      newUsedCount.set(previousValue, prevCount + 1)
    }
    
    setUsedNumbersCount(newUsedCount)
    
    // Restore previous cell state
    newBoard[row][col] = {
      ...cell,
      type: previousType,
      value: previousValue,
      isCorrect: previousIsCorrect,
      isError: previousIsError,
    }
    
    setBoard(newBoard)
    setHistory(prev => prev.slice(0, -1)) // Pop the stack
    setIsTyping(false)
  }, [history, board, gameStatus, usedNumbersCount])

  const replayBoard = useCallback(async () => {
    if (!currentPuzzle) return
    const id = currentPuzzle.id
    let puzzle: CrossMathPuzzle
    try {
      const cached = readPuzzleCache(id)
      puzzle = cached || (await gameApi.getPuzzleById('crossmath', id)) as CrossMathPuzzle
    } catch {
      const sp = getPuzzleById(id)
      puzzle = sp || currentPuzzle
    }
    writePuzzleCache(puzzle)
    setCurrentPuzzle(puzzle)
    const gridCopy = puzzle.grid.map(row => row.map(cell => ({ ...cell })))
    setBoard(gridCopy)
    setUsedNumbersCount(new Map())
    setMistakes(0)
    setScore(0)
    setTime(getInitialTime(difficulty))
    setGameStatus('playing')
    setSelectedCell(null)
    setIsTyping(false)
    setHistory([])
    clearGameState()
  }, [currentPuzzle, difficulty])

  const resetBoard = useCallback(async () => {
    let puzzle: CrossMathPuzzle
    try {
      puzzle = isDailyChallenge
        ? (await gameApi.getDailyPuzzle('crossmath', getDailyDateString(dateParam))) as CrossMathPuzzle
        : (await gameApi.getPuzzle('crossmath', { difficulty })) as CrossMathPuzzle
    } catch {
      puzzle = isDailyChallenge
        ? getDailyCrossMathPuzzle(getDailyDate(dateParam), difficulty)
        : (usePatternMode ? getRandomPatternPuzzle(difficulty) : getRandomPuzzle(difficulty))
    }
    writePuzzleCache(puzzle)
    setCurrentPuzzle(puzzle)
    const gridCopy = puzzle.grid.map(row => row.map(cell => ({ ...cell })))
    setBoard(gridCopy)
    const limit = difficulty === 'hard' ? 2 : puzzle.maxMistakes
    setMaxMistakes(limit)
    setAvailableNumbers(new Set(puzzle.availableNumbers))
    setUsedNumbersCount(new Map())
    setMistakes(0)
    setScore(0)
    setTime(getInitialTime(difficulty))
    setGameStatus('playing')
    setSelectedCell(null)
    setIsTyping(false)
    setHistory([])
    clearGameState()
  }, [difficulty, usePatternMode, isDailyChallenge, dateParam])

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
      reportWin(puzzleId, difficulty, newScore, time, mistakes)
      
      // Clear selection on win
      setSelectedCell(null)
      setIsTyping(false)
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
    const isPrefix = correctValue !== null && String(correctValue).startsWith(newValueStr)

    // Auto-commit if correct, not a prefix, or if maximum length is reached
    if (isCorrect || !isPrefix || newValueStr.length === maxLen) {
      // Validate that the number is not already fully used elsewhere
      const requiredCount = requiredNumbersCount.get(num) || 0
      const adjustedUsedCount = newUsedCount.get(num) || 0
      
      if (adjustedUsedCount >= requiredCount) {
        // Prevent placing a number that is already used
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

      const newBoard = board.map(r => r.map(c => ({ ...c })))
      newBoard[row][col] = {
        ...cell,
        type: 'number',
        value: num,
        isCorrect: isCorrect,
        isError: !isCorrect,
      }
      setBoard(newBoard)

      // Track usage count - use newUsedCount as base to preserve overwriting decrement
      const updatedUsedCount = new Map(newUsedCount)
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
        const winScore = isCorrect ? score + SCORING.CORRECT_ANSWER : Math.max(0, score + SCORING.WRONG_ANSWER)
        markPuzzleCompleted('crossmath', puzzleId, {
          time: time,
          score: winScore,
          difficulty: difficulty,
        })
        reportWin(puzzleId, difficulty, winScore, time, mistakes)
        
        // Clear selection on win
        setSelectedCell(null)
        setIsTyping(false)
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
    undoLastMove,
    resetBoard,
    replayBoard,
    requestHint,
    availableHints: calculateAvailableHints(score),
    handleFeedbackComplete,
    canUndo: history.length > 0,
    loading,
  }
}
