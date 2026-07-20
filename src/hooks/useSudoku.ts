/**
 * Sudoku State Hook - Phase 4 + 5 Complete
 * Centralized state management with:
 * - Multiple puzzle datasets
 * - Difficulty system
 * - Random puzzle loading (API-backed, static fallback)
 * - Notes/Pencil mode
 * - Hint system with currency
 * - Score system
 * - Local storage persistence
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { SudokuBoard, Position, GameStatus, Difficulty } from '@shared/lib/sudoku/types'
import { getRandomPuzzle, getPuzzleById, puzzleDataset } from '@shared/data/sudoku'
import type { SudokuPuzzleData } from '@shared/data/sudoku/types'
import { gameApi } from '@/lib/api/gameApi'
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
  isValidCompletedBoard,
  isValidMove,
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

const CACHE_KEY = 'puzzroo_sudoku_cache_by_id'

function readCache(id: string): SudokuPuzzleData | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const map = JSON.parse(raw) as Record<string, SudokuPuzzleData>
    return map[id] ?? null
  } catch {
    return null
  }
}

function writeCache(id: string, puzzle: SudokuPuzzleData) {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, SudokuPuzzleData>) : {}
    map[id] = puzzle
    localStorage.setItem(CACHE_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

function getDailySudokuPuzzle(date: Date, diff: Difficulty) {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
  const pool = puzzleDataset[diff as 'easy' | 'medium' | 'hard'] || puzzleDataset['easy']
  const x = Math.sin(seed) * 10000
  const rand = x - Math.floor(x)
  const index = Math.floor(rand * pool.length)
  return pool[index]
}

type PuzzleSource =
  | { kind: 'random'; difficulty: Difficulty; exclude?: string }
  | { kind: 'byId'; id: string }
  | { kind: 'daily'; date?: string; difficulty: Difficulty }

/**
 * Fetch a puzzle from the API with a static fallback. Caches successful
 * fetches by puzzle id so offline replay works.
 */
async function loadSudokuPuzzle(source: PuzzleSource): Promise<SudokuPuzzleData> {
  try {
    let raw
    if (source.kind === 'random') {
      raw = await gameApi.getPuzzle('sudoku', {
        difficulty: source.difficulty,
        exclude: source.exclude,
      })
    } else if (source.kind === 'byId') {
      const cached = readCache(source.id)
      if (cached) return cached
      raw = await gameApi.getPuzzleById('sudoku', source.id)
    } else {
      raw = await gameApi.getDailyPuzzle('sudoku', source.date)
    }
    const puzzle = raw as unknown as SudokuPuzzleData
    writeCache(puzzle.id, puzzle)
    return puzzle
  } catch {
    if (source.kind === 'random') {
      return getRandomPuzzle(source.difficulty, source.exclude)
    }
    if (source.kind === 'byId') {
      return getPuzzleById(source.id) ?? getRandomPuzzle('easy')
    }
    let dailyDate = new Date()
    if (source.date) {
      const [y, m, d] = source.date.split('-')
      if (y && m && d) dailyDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
    }
    return getDailySudokuPuzzle(dailyDate, source.difficulty)
  }
}

function transformPuzzle(
  puzzle: SudokuPuzzleData,
  isDaily: boolean,
  dateParam?: string | null
) {
  const currentBoard = convertToSudokuBoard(puzzle.puzzle)
  const initialBoard = cloneBoard(currentBoard)
  const solution = convertToSudokuBoard(puzzle.solution)

  return {
    currentBoard,
    initialBoard,
    solution,
    puzzleId: isDaily && dateParam ? `daily-sudoku-${dateParam}` : puzzle.id,
    mistakes: 0,
    score: 0,
    time: 0,
    gameStatus: 'playing' as GameStatus,
  }
}

export function useSudoku() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlDifficulty = (searchParams.get('difficulty') || 'easy') as Difficulty
  const urlId = searchParams.get('id')

  // Check if this is from daily challenge
  const dateParam = searchParams.get('date')
  const isDailyChallenge = !!dateParam || (typeof window !== 'undefined' && window.location.pathname.includes('/daily-challenge/'))

  // Load difficulty preference
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [isInitialized, setIsInitialized] = useState(false)
  const [loading, setLoading] = useState(false)

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

    // Load new puzzle (static fallback for synchronous SSR render)
    const puzzle = isDailyChallenge
      ? getDailySudokuPuzzle(new Date(), diff)
      : getRandomPuzzle(diff)

    return transformPuzzle(puzzle, isDailyChallenge, dateParam)
  }, [isDailyChallenge, dateParam])

  const [gameState, setGameState] = useState(() => {
    // Fallback initializer for initial server render
    return initializeGame('easy', false)
  })

  // Refs
  const puzzleIdRef = useRef(gameState.puzzleId)
  const hintsUsedRef = useRef(0)

  useEffect(() => {
    puzzleIdRef.current = gameState.puzzleId
  }, [gameState.puzzleId])

  // Sync with URL difficulty on mount/change
  useEffect(() => {
    if (typeof window === 'undefined') return

    const valid = ['easy', 'medium', 'hard', 'expert']
    const currentDiff = valid.includes(urlDifficulty) ? urlDifficulty : 'easy'

    setDifficulty(currentDiff)
    saveDifficultyPreference(currentDiff)

    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        // Resume a saved in-progress game if it matches the requested difficulty
        const saved = loadGameState()
        if (!cancelled && (!isInitialized || !gameState.puzzleId || gameState.currentBoard.length === 0 || saved?.difficulty === currentDiff)) {
          if (saved && saved.difficulty === currentDiff) {
            setGameState({
              currentBoard: saved.currentBoard,
              initialBoard: saved.initialBoard,
              solution: saved.solution,
              puzzleId: saved.puzzleId,
              mistakes: saved.mistakes,
              score: saved.score,
              time: saved.time,
              gameStatus: saved.gameStatus as GameStatus,
            })
            puzzleIdRef.current = saved.puzzleId
            setIsInitialized(true)
            return
          }
        }

        // Start fresh — fetch from API (static fallback on failure)
        const puzzle = urlId
          ? await loadSudokuPuzzle({ kind: 'byId', id: urlId })
          : isDailyChallenge
            ? await loadSudokuPuzzle({ kind: 'daily', date: dateParam ?? undefined, difficulty: currentDiff })
            : await loadSudokuPuzzle({ kind: 'random', difficulty: currentDiff, exclude: gameState.puzzleId })

        if (cancelled) return
        const next = transformPuzzle(puzzle, isDailyChallenge, dateParam)
        setGameState(next)
        puzzleIdRef.current = next.puzzleId
        setIsInitialized(true)
      } catch {
        /* fall through to static fallback below */
        if (!cancelled) {
          const puzzle = isDailyChallenge
            ? getDailySudokuPuzzle(new Date(), currentDiff)
            : getRandomPuzzle(currentDiff)
          const next = transformPuzzle(puzzle, isDailyChallenge, dateParam)
          setGameState(next)
          puzzleIdRef.current = next.puzzleId
          setIsInitialized(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlDifficulty, urlId, isDailyChallenge, dateParam])

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
   * Report a win to the universal completion system and (when authenticated)
   * the API. Never blocks gameplay.
   */
  const reportWin = useCallback((puzzleId: string, finalScore: number) => {
    markPuzzleCompleted('sudoku', puzzleId, {
      time: gameState.time,
      score: finalScore,
      difficulty,
    })

    const token =
      typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    if (token) {
      gameApi
        .complete('sudoku', {
          puzzleId,
          difficulty: difficulty as 'easy' | 'medium' | 'hard',
          score: finalScore,
          time: gameState.time,
          hintsUsed: hintsUsedRef.current,
          mistakes: gameState.mistakes,
          moves: undefined,
        })
        .catch(() => {
          /* fire-and-forget: never block */
        })
    }
  }, [gameState.time, gameState.mistakes, difficulty])

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

      // No-op if the same value is already in the cell (avoid double-scoring).
      if (cell.value === num) return

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

      // A move is correct ONLY when it matches the puzzle's unique solution.
      const solutionCell = gameState.solution?.[selectedCell.row]?.[selectedCell.col]
      const solutionValue =
        solutionCell && typeof solutionCell === "object"
          ? (solutionCell as { value?: number }).value
          : (solutionCell as number | undefined)
      const isCorrectValue = num === solutionValue

      if (!isCorrectValue) {
        // Wrong value (even if it doesn't immediately break Sudoku rules).
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
        // Correct value - matches the solution.
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
          reportWin(puzzleId, gameState.score + 10)

          setTimeout(() => {
            setGameState((prev) => ({ ...prev, gameStatus: 'won' }))
            setIsWinAnimating(false)
            clearGameState()
          }, 1500)
        }
      }

      setSelectedNumber(num)
    },
    [selectedCell, gameState, notesMode, updateScore, difficulty, reportWin]
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

    hintsUsedRef.current += 1
    updateScore(-20) // -20 for hint
    setGameState((prev) => ({ ...prev, currentBoard: newBoard }))

    // Check for win - validate entire board using Sudoku rules
    if (isBoardComplete(newBoard) && isValidCompletedBoard(newBoard)) {
      setIsWinAnimating(true)

      // Mark puzzle as completed in universal completion system
      const dateParam = searchParams.get('date')
      // Convert date to full puzzle ID format: daily-sudoku-MM-DD-YY
      const puzzleId = dateParam ? `daily-sudoku-${dateParam}` : gameState.puzzleId
      reportWin(puzzleId, gameState.score - 20)

      setTimeout(() => {
        setGameState((prev) => ({ ...prev, gameStatus: 'won' }))
        setIsWinAnimating(false)
        clearGameState()
      }, 1500)
    }
  }, [selectedCell, gameState, updateScore, reportWin])

  /**
   * Change difficulty
   */
  const changeDifficulty = useCallback((newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty)
    saveDifficultyPreference(newDifficulty)
    router.push(`/sudoku?difficulty=${newDifficulty}`)
  }, [difficulty, router])

  /**
   * Reset board / New game (async fetch from API)
   */
  const resetBoard = useCallback(async () => {
    setSelectedCell(null)
    setSelectedNumber(null)
    setNotesMode(false)
    setIsWinAnimating(false)
    setScoreFeedbacks([])
    startTimeRef.current = null
    hintsUsedRef.current = 0

    setLoading(true)
    let cancelled = false
    try {
      const puzzle = await loadSudokuPuzzle({
        kind: 'random',
        difficulty,
        exclude: puzzleIdRef.current,
      })
      if (!cancelled) {
        const next = transformPuzzle(puzzle, false)
        setGameState(next)
        puzzleIdRef.current = next.puzzleId
      }
    } catch {
      if (!cancelled) {
        const next = transformPuzzle(getRandomPuzzle(difficulty), false)
        setGameState(next)
        puzzleIdRef.current = next.puzzleId
      }
    } finally {
      if (!cancelled) setLoading(false)
    }
  }, [difficulty])

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
    loading,
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
