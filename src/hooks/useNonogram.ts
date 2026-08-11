/**
 * Nonogram State Hook - Phase 3: Input Mode System
 * Game logic with explicit Fill/Mark mode system and flip animation
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  CellState,
  CellPosition,
  Difficulty,
  PuzzleData,
  ValidationStatus,
  GameStatus,
  GameProgress,
  InputMode,
  ValidationMode,
  Clue,
} from '@shared/lib/nonogram/types'

// Drag state types
type DragDirection = 'horizontal' | 'vertical' | null
import {
  createEmptyGrid,
  checkPuzzleCompletion,
  validateAllRows,
  validateAllColumns,
  calculateProgress,
  isCellMistake,
  findHintPosition,
} from '@shared/lib/nonogram/helpers'
import {
  saveGameState,
  loadGameState,
  clearGameState,
  updateStatsOnCompletion,
  getHintLimits,
  saveDifficultyPreference,
  loadDifficultyPreference,
} from '@shared/lib/nonogram/storage'
import { getTimeLimitSeconds } from '@shared/lib/nonogram/constants'
import { markPuzzleCompleted } from '@shared/lib/completion/universal'
import { updateChallengeStatus, getChallengeStatus } from '@shared/lib/dailyChallenge/storage'

function getTodayDateParam(): string {
  const d = new Date()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  const y = String(d.getUTCFullYear()).slice(-2)
  return `${m}-${day}-${y}`
}

import { gameApi } from '@/lib/api/gameApi'
import { getAccessToken, ensureGuestId, isLoggedIn, resetGuestProgressIfNewGame } from '@/lib/auth/frontend-auth'

// Module-level guard to cancel StrictMode double-mount in dev
let _nonogramMountGuard = false

const NONOGRAM_CACHE_KEY = 'puzzroo_nonogram_cache_by_id'

function readCache(id: string): PuzzleData | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(NONOGRAM_CACHE_KEY)
    if (!raw) return null
    const map = JSON.parse(raw) as Record<string, PuzzleData>
    return map[id] || null
  } catch {
    return null
  }
}

function writeCache(id: string, puzzle: PuzzleData): void {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(NONOGRAM_CACHE_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, PuzzleData>) : {}
    map[id] = puzzle
    localStorage.setItem(NONOGRAM_CACHE_KEY, JSON.stringify(map))
  } catch {
    // ignore cache write failures
  }
}

function toClueObjects(raw: any): Clue[] {
  if (!Array.isArray(raw)) return []
  return raw.map((c: any) =>
    Array.isArray(c)
      ? { values: c }
      : { values: Array.isArray(c?.values) ? c.values : [] }
  )
}

function getDailyDate(dateParam?: string | null): Date {
  if (dateParam) {
    const [month, day, year] = dateParam.split('-')
    const fullYear = 2000 + parseInt(year)
    return new Date(Date.UTC(fullYear, parseInt(month) - 1, parseInt(day)))
  }
  return new Date()
}

function getDailyDateString(dateParam?: string | null): string {
  const d = getDailyDate(dateParam)
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${d.getUTCFullYear()}-${m}-${day}`
}


export function useNonogram(initialPuzzleId?: string) {
  const searchParams = useSearchParams()
  const urlDifficulty = (searchParams.get('difficulty') || 'easy') as Difficulty
  const savedDifficulty = loadDifficultyPreference() as Difficulty

  const getInitialDifficulty = (): Difficulty => {
    if (urlDifficulty && ['easy', 'medium', 'hard'].includes(urlDifficulty)) return urlDifficulty as Difficulty
    return (savedDifficulty || 'easy') as Difficulty
  }

  const [difficulty, setDifficultyState] = useState<Difficulty>(getInitialDifficulty)

  const setDifficulty = useCallback((d: Difficulty) => {
    setDifficultyState(d)
    saveDifficultyPreference(d)
  }, [])
  const [currentPuzzle, setCurrentPuzzle] = useState<PuzzleData | null>(null)
  const [grid, setGrid] = useState<CellState[][]>([])
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null)
  const [selectionHistory, setSelectionHistory] = useState<CellPosition[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const initTokenRef = useRef(0)

  // Check if this is from daily challenge
  const dateParam = searchParams.get('date')
  const isDailyChallenge = !!dateParam || (typeof window !== 'undefined' && window.location.pathname.includes('/daily-challenge/'))

  // Reset guest progress if navigating from another page
  resetGuestProgressIfNewGame('nonogram')

  // Phase 3: Input mode system
  const [inputMode, setInputMode] = useState<InputMode>('fill')
  const [validationMode, setValidationMode] = useState<ValidationMode>('assisted')

  // Phase 2: Game state
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing')
  const gameStatusRef = useRef(gameStatus)
  useEffect(() => {
    gameStatusRef.current = gameStatus
  }, [gameStatus])
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [rowValidation, setRowValidation] = useState<ValidationStatus[]>([])
  const [columnValidation, setColumnValidation] = useState<ValidationStatus[]>([])
  const [progress, setProgress] = useState<GameProgress>({
    totalCellsRequired: 0,
    correctCellsFilled: 0,
    percentComplete: 0,
  })
  const [hintsUsed, setHintsUsed] = useState(0)
  const [maxHints, setMaxHints] = useState(5)
  const [errorCell, setErrorCell] = useState<CellPosition | null>(null)
  const [mistakeCount, setMistakeCount] = useState(0)
  const [moveCount, setMoveCount] = useState(0)

  // Hovered Cell and Mouse coordinates for tooltip
  const [hoveredCell, setHoveredCell] = useState<CellPosition | null>(null)
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null)

  // Drag state
  const [isDragging, setIsDragging] = useState(false)
  const [dragPreviewCells, setDragPreviewCells] = useState<Set<string>>(new Set())
  const [dragAction, setDragAction] = useState<'fill' | 'erase' | 'mark' | 'unmark' | null>(null)
  const dragStartPos = useRef<CellPosition | null>(null)
  const dragPathRef = useRef<string[]>([])

  const hasDraggedRef = useRef(false)
  const wasDraggingRef = useRef(false)

  // Timer ref
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)

  // Guard to prevent duplicate click/tap actions (pointer events vs click event race condition)
  const pointerHandledRef = useRef(false)
  const lastInteractionRef = useRef<{ row: number; col: number; timestamp: number } | null>(null)

  // Track action type during dragging
  const dragActionRef = useRef<'fill' | 'erase' | 'mark' | 'unmark' | null>(null)
  const processedDragCellsRef = useRef<Set<string>>(new Set())

  const sessionIdRef = useRef<string | null>(null)
  const sessionCreatedRef = useRef(false)
  const completionCalledRef = useRef(false)
  const lostAbandonedRef = useRef(false)

  // Single authoritative save pipeline: serialized, coalescing, never overlapping.
  // A save is only sent when the previous one completed; intermediate snapshots
  // are coalesced into the latest one, so no request is ever aborted.
  const saveQueueRef = useRef<{
    inFlight: boolean
    pending: { grid: CellState[][]; elapsed: number; hints: number; mists: number; moves: number } | null
  }>({ inFlight: false, pending: null })
  const drainPromiseRef = useRef<Promise<void> | null>(null)

  // Mirrors for close-time flush (pagehide / visibilitychange)
  const gridRef = useRef<CellState[][]>([])
  const elapsedSecondsRef = useRef(0)
  const hintsUsedRef = useRef(0)
  const mistakeCountRef = useRef(0)
  const moveCountRef = useRef(0)
  const difficultyRef = useRef<Difficulty>(difficulty)
  const puzzleIdRef = useRef('')
  const lastSaveQueuedAtRef = useRef(Date.now())
  // Wall-clock moment the timer last ticked. The countdown state is driven by
  // a 1s setInterval, so between the last tick and an unload moment the true
  // remaining time is "countdown − since-tick gap". Basing the gap on the last
  // TICK (not the last save) avoids double- subtracting seconds the countdown
  // already counted.
  const lastTickAtRef = useRef(Date.now())

  useEffect(() => {
    gridRef.current = grid
    elapsedSecondsRef.current = elapsedSeconds
    hintsUsedRef.current = hintsUsed
    mistakeCountRef.current = mistakeCount
    moveCountRef.current = moveCount
    difficultyRef.current = difficulty
    puzzleIdRef.current = currentPuzzle?.id ?? ''
  }, [grid, elapsedSeconds, hintsUsed, mistakeCount, moveCount, difficulty, currentPuzzle])

  async function initSession(puzzleId: string, diff: string): Promise<any> {
    if (sessionCreatedRef.current) return null
    completionCalledRef.current = false
    if (typeof window === 'undefined') return null
    if (!getAccessToken()) {
      ensureGuestId()
    }
    try {
      const challengeId = isDailyChallenge ? `daily-nonogram-${dateParam || getTodayDateParam()}` : null
      const res = challengeId
        ? await gameApi.createDailySession('nonogram', puzzleId, challengeId)
        : await gameApi.createSession('nonogram', puzzleId, diff)
      if (res && (res.sessionId || res._id || res.id)) {
        sessionIdRef.current = res.sessionId || res._id || res.id
        sessionCreatedRef.current = true
        return res
      }
    } catch { /* no session */ }
    return null
  }

  function drainSaveQueue(): Promise<void> {
    if (!sessionIdRef.current) return Promise.resolve()
    if (!drainPromiseRef.current) {
      drainPromiseRef.current = (async () => {
        try {
          while (saveQueueRef.current.pending) {
            const item = saveQueueRef.current.pending
            saveQueueRef.current.pending = null
            try {
              await gameApi.saveMove('nonogram', sessionIdRef.current!, {
                grid: item.grid,
                elapsedTime: item.elapsed,
                hintsUsed: item.hints,
                mistakes: item.mists,
                moves: item.moves,
              })
            } catch (err) {
              // Network/server failure: drop the snapshot, keep local state.
              // The next save carries the full grid and self-heals the server.
              console.error('[nonogram] save move failed', err)
              break
            }
          }
        } finally {
          drainPromiseRef.current = null
          // A save may have been enqueued between the last loop check and
          // this finally — never orphan it.
          if (saveQueueRef.current.pending) void drainSaveQueue()
        }
      })()
    }
    return drainPromiseRef.current
  }

  function saveMoveNow(g: CellState[][], elapsed: number, hints: number, mists: number, moves: number) {
    if (!sessionIdRef.current || completionCalledRef.current) return
    lastSaveQueuedAtRef.current = Date.now()
    saveQueueRef.current.pending = { grid: g, elapsed, hints, mists, moves }
    void drainSaveQueue()
  }

  /**
   * Persist the close-moment elapsed time (unload, tab hide, or the final
   * countdown tick). Computed from the countdown state minus only the time
   * since the last tick — never from the last save, which would double-subtract
   * seconds the countdown already counted.
   */
  const flushElapsedNow = useCallback(() => {
    if (!sessionIdRef.current || completionCalledRef.current) return
    if (gameStatusRef.current !== 'playing') return
    if (gridRef.current.length === 0) return
    const gapSec = Math.max(0, Math.round((Date.now() - lastTickAtRef.current) / 1000))
    const remaining = Math.max(0, elapsedSecondsRef.current - gapSec)
    const initialTime = getTimeLimitSeconds(difficultyRef.current)
    saveMoveNow(gridRef.current, Math.max(0, initialTime - remaining), hintsUsedRef.current, mistakeCountRef.current, moveCountRef.current)
    // Persist the exact close-moment remaining locally too, so a restore that
    // prefers the local snapshot sees the true countdown instead of a rewound
    // one (the server save above is async and can be lost on navigation).
    if (puzzleIdRef.current) {
      saveGameState({
        grid: gridRef.current,
        puzzleId: puzzleIdRef.current,
        difficulty: difficultyRef.current,
        elapsedSeconds: remaining,
        hintsUsed: hintsUsedRef.current,
        mistakeCount: mistakeCountRef.current,
        moveCount: moveCountRef.current,
        timestamp: Date.now(),
      })
    }
  }, [])

  async function completePuzzle(g: CellState[][], elapsed: number, hints: number, mists: number, moves: number) {
    if (!sessionIdRef.current || completionCalledRef.current) return
    completionCalledRef.current = true
    try {
      // All pending saves must land before the terminal transition
      await drainSaveQueue()
      await gameApi.completeSession('nonogram', sessionIdRef.current, {
        grid: g,
        elapsedTime: elapsed,
        hintsUsed: hints,
        mistakes: mists,
        moves,
      })
    } catch { /* ignore */ }
  }

  async function abandonSession() {
    if (!sessionIdRef.current) return
    const sid = sessionIdRef.current
    try {
      // All pending saves must land before the terminal transition
      await drainSaveQueue()
      sessionIdRef.current = null
      sessionCreatedRef.current = false
      await gameApi.abandonSession('nonogram', sid)
    } catch { /* ignore */ }
  }

  const lastMoveKeyRef = useRef('')

  useEffect(() => {
    if (!sessionIdRef.current || gameStatus !== 'playing') return
    const key = JSON.stringify({ g: grid, h: hintsUsed, m: mistakeCount })
    if (key === lastMoveKeyRef.current) return
    lastMoveKeyRef.current = key
    const initialTime = getTimeLimitSeconds(difficulty)
    const elapsed = Math.max(0, initialTime - elapsedSeconds)
    saveMoveNow(grid, elapsed, hintsUsed, mistakeCount, moveCount)
  }, [grid, hintsUsed, mistakeCount, elapsedSeconds, gameStatus])

  /**
   * Initialize a new puzzle
   */
  const initializePuzzle = useCallback(async (diff: Difficulty, loadSaved = true, puzzleId?: string, refresh = false) => {
    // Load new puzzle (async fetch from API with static fallback + cache)
    const token = ++initTokenRef.current
    let cancelled = false

    const applyPuzzle = async (puzzle: PuzzleData) => {
      if (token !== initTokenRef.current) return
      setCurrentPuzzle(puzzle)
      setGrid(createEmptyGrid(puzzle.size))
      setMistakeCount(0)
      setMoveCount(0)
      setSelectedCell(null) // ✅ Clear selected cell
      setHoveredCell(null) // ✅ Clear hover state
      setSelectionHistory([])

      // Set initial countdown time based on difficulty: easy=10m (600), medium=7m (420), hard=5m (300)
      setElapsedSeconds(getTimeLimitSeconds(diff))

      setHintsUsed(0)
      setMaxHints(getHintLimits(diff))
      setGameStatus('playing')
      setRowValidation(Array(puzzle.size).fill('incomplete'))
      setColumnValidation(Array(puzzle.size).fill('incomplete'))
      setProgress({
        totalCellsRequired: 0,
        correctCellsFilled: 0,
        percentComplete: 0,
      })
      setInputMode('fill')
      startTimeRef.current = null
      setMistakeCount(0)
      setDifficulty(diff)
    }

    setLoading(true)
    let puzzle: PuzzleData | null = null

    // Server-backed resume first (the server session is authoritative).
    // Falls back to the normal fresh/localStorage path below when there is
    // no active server session. Any restore failure is non-fatal: a fresh
    // puzzle is loaded instead of breaking the mount.
    // ✅ GUEST USERS: Skip server session restore — guests always start fresh
    if (loadSaved && !puzzleId && typeof window !== 'undefined' && isLoggedIn()) {
      try {
        const challengeId = `daily-nonogram-${dateParam || getTodayDateParam()}`
        const continueResult = isDailyChallenge
          ? await gameApi.getContinueDaily('nonogram', challengeId)
          : await gameApi.getContinue('nonogram', diff)
        const serverSession = continueResult?.hasActiveSession
          ? (continueResult as any).session
          : null

        if (serverSession && serverSession.sessionId && serverSession.puzzle && serverSession.puzzle.id) {
          if (token !== initTokenRef.current) return
          const sp = serverSession.puzzle
          const restoredPuzzle: PuzzleData = {
            id: sp.id,
            title: sp.title || '',
            difficulty: (sp.difficulty || diff) as Difficulty,
            size: sp.size as PuzzleData['size'],
            category: sp.category || '',
            estimatedTime: sp.estimatedTime || 0,
            solution: Array.isArray(sp.solution) ? sp.solution : [],
            rowClues: toClueObjects(sp.rowClues),
            columnClues: toClueObjects(sp.columnClues),
          }

          const serverGrid: CellState[][] = Array.isArray(serverSession.grid)
            ? serverSession.grid.map((row: any[]) => Array.isArray(row) ? [...row] : [])
            : []
          if (serverGrid.length === restoredPuzzle.size && serverGrid.every((r: CellState[]) => r.length === restoredPuzzle.size)) {
            setCurrentPuzzle(restoredPuzzle)
            writeCache(restoredPuzzle.id, restoredPuzzle)
            setGrid(serverGrid)
            setMistakeCount(serverSession.mistakes || 0)
            setMoveCount(serverSession.moves || 0)
            setHintsUsed(serverSession.hintsUsed || 0)

            const restoredDiff = (serverSession.difficulty || diff) as Difficulty
            setDifficulty(restoredDiff)
            setMaxHints(getHintLimits(restoredDiff))
            // Prefer the exact close-moment local snapshot: unmount/pagehide
            // flush writes it synchronously, while the server save is async and
            // may not have landed (or may reflect a throttled tick). Fall back
            // to the server elapsed (timeLimit − elapsed) when no matching
            // snapshot exists.
            const local = loadGameState()
            const freshLocal =
              local &&
              local.puzzleId === restoredPuzzle.id &&
              local.difficulty === restoredDiff &&
              (local.gameStatus === undefined || local.gameStatus === 'playing')
            const restoredElapsed = freshLocal
              ? Math.max(0, local.elapsedSeconds)
              : Math.max(0, getTimeLimitSeconds(restoredDiff) - (serverSession.elapsedTime || 0))
            setElapsedSeconds(restoredElapsed)
            setGameStatus('playing')
            setRowValidation(validateAllRows(serverGrid, restoredPuzzle.rowClues))
            setColumnValidation(validateAllColumns(serverGrid, restoredPuzzle.columnClues))
            setProgress(calculateProgress(serverGrid, restoredPuzzle.solution))
            setInputMode('fill')
            setSelectedCell(null)
            setHoveredCell(null) // ✅ Clear hover state
            setSelectionHistory([])
            startTimeRef.current = null

            sessionIdRef.current = serverSession.sessionId
            sessionCreatedRef.current = true
            completionCalledRef.current = false

            setLoading(false)
            return
          }
        }
      } catch {
        // restore failed: fall through to the fresh/localStorage path below
      }
    }

    try {
      if (puzzleId) {
        const cached = refresh ? null : readCache(puzzleId)
        if (cached) {
          puzzle = cached
        } else {
          const res = await gameApi.getPuzzleById('nonogram', puzzleId)
          if (!res || !(res as any).id) throw new Error('invalid_puzzle')
          puzzle = res as unknown as PuzzleData
          writeCache(puzzle.id, puzzle)
        }
      } else if (isDailyChallenge) {
        const res = await gameApi.getDailyPuzzle('nonogram', getDailyDateString(dateParam), diff)
        if (!res || !(res as any).id) throw new Error('invalid_puzzle')
        puzzle = res as unknown as PuzzleData
        writeCache(puzzle.id, puzzle)
      } else {
        const res = await gameApi.getPuzzle('nonogram', { difficulty: diff })
        if (!res || !(res as any).id) throw new Error('invalid_puzzle')
        puzzle = res as unknown as PuzzleData
        writeCache(puzzle.id, puzzle)
      }
    } catch {
      setLoading(false)
      setError('Failed to load puzzle. Please try again.')
      return
    }
    if (cancelled || !puzzle) {
      if (!cancelled) setLoading(false)
      return
    }

    const targetPuzzleId = isDailyChallenge && dateParam ? `daily-nonogram-${dateParam}` : puzzle.id

    if (loadSaved && typeof window !== 'undefined') {
      const saved = loadGameState()
      if (saved && saved.puzzleId === targetPuzzleId && saved.difficulty === diff) {
        setCurrentPuzzle(puzzle)
        setGrid(saved.grid)
        setMistakeCount(saved.mistakeCount)
        setMoveCount(saved.moveCount || 0)
        setSelectedCell(null) // ✅ Clear selected cell
        setHoveredCell(null) // ✅ Clear hover state
        setElapsedSeconds(saved.elapsedSeconds)
        // Completed snapshots restore the win/loss review (survives FAQ/back
        // navigation); in-progress games always resume as playing.
        const restoredStatus = saved.gameStatus === 'won' || saved.gameStatus === 'lost'
          ? saved.gameStatus
          : 'playing'
        setGameStatus(restoredStatus)
        setHintsUsed(saved.hintsUsed)

        const maxH = getHintLimits(diff)
        setMaxHints(maxH)

        const colVal = validateAllColumns(saved.grid, puzzle.columnClues)
        const rowVal = validateAllRows(saved.grid, puzzle.rowClues)
        setColumnValidation(colVal)
        setRowValidation(rowVal)

        const prog = calculateProgress(saved.grid, puzzle.solution)
        setProgress(prog)
        setDifficulty(diff)
        // Only an in-progress game gets a fresh server session — a restored
        // completion's session is already closed server-side.
        if (restoredStatus === 'playing') initSession(puzzle.id, diff)
        if (!cancelled) setLoading(false)
        return
      }
    }

    applyPuzzle(puzzle)
    initSession(puzzle.id, diff)
    if (!cancelled) setLoading(false)
  }, [isDailyChallenge, dateParam])

  /**
   * Sync with URL difficulty on mount/change
   */
  useEffect(() => {
    // StrictMode double-mount guard: skip first mount in dev
    if (process.env.NODE_ENV === 'development' && !_nonogramMountGuard) {
      _nonogramMountGuard = true
      return
    }

    if (typeof window !== 'undefined' && !isInitialized) {
      const valid = ['easy', 'medium', 'hard']
      const currentDiff = valid.includes(urlDifficulty) ? urlDifficulty : 'easy'

      setDifficulty(currentDiff)
      // Use provided puzzleId or let initializePuzzle use random
      initializePuzzle(currentDiff, true, initialPuzzleId)
      setIsInitialized(true)
    }

    return () => {
      if (process.env.NODE_ENV === 'development') _nonogramMountGuard = false
    }
  }, [urlDifficulty, isInitialized, initialPuzzleId, initializePuzzle])

  // Update challenge status to in-progress when game is loaded
  useEffect(() => {
    if (isInitialized && currentPuzzle && isDailyChallenge) {
      const challengeId = dateParam ? `daily-nonogram-${dateParam}` : `daily-nonogram-${getTodayDateParam()}`
      const currentStatus = getChallengeStatus(challengeId)
      if (currentStatus !== 'completed') {
        updateChallengeStatus(challengeId, 'in-progress')
      }
    }
  }, [isInitialized, currentPuzzle, isDailyChallenge, dateParam])

  /**
   * Timer management
   */
  useEffect(() => {
    if (gameStatus !== 'playing') {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      return
    }

    lastTickAtRef.current = Date.now()
    timerRef.current = setInterval(() => {
      lastTickAtRef.current = Date.now()
      if (elapsedSecondsRef.current <= 1) {
        // Final tick: persist the exact elapsed moment BEFORE flipping to
        // lost, then stop the timer and end the game (previously the last
        // tick was dropped and the transition ran inside the state updater).
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        flushElapsedNow()
        setElapsedSeconds(0)
        clearGameState()
        if (puzzleIdRef.current) {
          saveGameState({
            grid: gridRef.current,
            puzzleId: puzzleIdRef.current,
            difficulty: difficultyRef.current,
            elapsedSeconds: 0,
            hintsUsed: hintsUsedRef.current,
            mistakeCount: mistakeCountRef.current,
            moveCount: moveCountRef.current,
            gameStatus: 'lost',
            completedAt: Date.now(),
            timestamp: Date.now(),
          })
        }
        setGameStatus('lost')
        return
      }
      setElapsedSeconds((prev) => prev - 1)
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [gameStatus, flushElapsedNow])

  /**
   * Auto-save game state
   */
  useEffect(() => {
    if (isInitialized && gameStatus === 'playing' && currentPuzzle) {
      lastSaveQueuedAtRef.current = Date.now()
      saveGameState({
        grid,
        puzzleId: currentPuzzle.id,
        difficulty,
        elapsedSeconds,
        hintsUsed,
        mistakeCount,
        moveCount,
        timestamp: Date.now(),
      })
    }
  }, [grid, currentPuzzle, difficulty, elapsedSeconds, hintsUsed, mistakeCount, gameStatus, isInitialized])

  /**
   * Flush the exact close-moment elapsed time to the server when the page is
   * closed or hidden (tab close, navigation, back button). Server saves only
   * run on moves, so without this the restored countdown would rewind to the
   * last move. Restores use the stored elapsed as-is (timer pauses while away).
   */
  useEffect(() => {
    if (gameStatus !== 'playing' || grid.length === 0) return

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushElapsedNow()
    }
    window.addEventListener('pagehide', flushElapsedNow)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flushElapsedNow)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [gameStatus, grid.length, flushElapsedNow])

  /**
   * Flush on component unmount. SPA navigation (e.g. to account details) does
   * not fire pagehide or visibilitychange, so without this the close-moment
   * time would never reach the server and the next restore would rewind.
   */
  useEffect(() => {
    return () => {
      flushElapsedNow()
    }
  }, [flushElapsedNow])

  /**
   * Validation and progress tracking on grid change
   */
  useEffect(() => {
    if (!currentPuzzle || gameStatus !== 'playing') return

    // Validate rows and columns
    const rowStatus = validateAllRows(grid, currentPuzzle.rowClues)
    const colStatus = validateAllColumns(grid, currentPuzzle.columnClues)

    setRowValidation(rowStatus)
    setColumnValidation(colStatus)

    // Calculate progress
    const gameProgress = calculateProgress(grid, currentPuzzle.solution)
    setProgress(gameProgress)

    // Check for completion
    const isComplete = checkPuzzleCompletion(grid, currentPuzzle.solution)
    if (isComplete) {
      setGameStatus('won')
      updateStatsOnCompletion(elapsedSeconds)

      // Mark puzzle as completed in universal tracking system
      const dateParam = searchParams.get('date')
      // Convert date to full puzzle ID format: daily-nonogram-MM-DD-YY
      const puzzleId = dateParam ? `daily-nonogram-${dateParam}` : currentPuzzle.id
      markPuzzleCompleted('nonogram', puzzleId, {
        time: elapsedSeconds,
        hintsUsed: hintsUsed,
        difficulty: currentPuzzle.difficulty,
      })
      if (isDailyChallenge) {
        updateChallengeStatus(puzzleId, 'completed')
      }

      // Report completion to the API (fire-and-forget). The session complete
      // endpoint owns all server side effects (stats, daily, leaderboard).
      const initialTime = getTimeLimitSeconds(difficulty)
      const elapsed = Math.max(0, initialTime - elapsedSeconds)
      void completePuzzle(grid, elapsed, hintsUsed, mistakeCount, moveCount)

      // Persist a COMPLETED snapshot instead of clearing. The review survives
      // navigation (FAQ, back button) — on remount the hook restores the won
      // state so the completion modal is still shown. The snapshot is
      // overwritten by the next game start and discarded when stale.
      saveGameState({
        grid,
        puzzleId: currentPuzzle.id,
        difficulty: currentPuzzle.difficulty,
        elapsedSeconds,
        hintsUsed,
        mistakeCount,
        moveCount,
        gameStatus: 'won',
        completedAt: Date.now(),
        timestamp: Date.now(),
      })
    }
  }, [grid, currentPuzzle, gameStatus, elapsedSeconds])

  // Track selection history for reverse navigation/deletion
  useEffect(() => {
    if (selectedCell) {
      setSelectionHistory((prev) => {
        const last = prev[prev.length - 1]
        if (last && last.row === selectedCell.row && last.col === selectedCell.col) {
          return prev
        }
        return [...prev, selectedCell]
      })
    }
  }, [selectedCell])

  /**
   * Apply cell action based on input mode
   */
  const applyCellAction = useCallback((position: CellPosition, mode: InputMode, isDrag = false): CellState => {
    const currentState = grid[position.row]?.[position.col]

    // Check if cell is correct and filled (part of the solution)
    const isCorrectAndFilled = currentState === 'filled' && currentPuzzle?.solution[position.row]?.[position.col] === 1
    if (isCorrectAndFilled) {
      return 'filled' // Cannot be erased or changed!
    }

    if (isDrag && dragActionRef.current) {
      const action = dragActionRef.current
      if (action === 'fill') return 'filled'
      if (action === 'erase') return 'empty'
      if (action === 'mark') return 'marked'
      return 'empty'
    }

    if (mode === 'fill') {
      return (currentState === 'filled' || currentState === 'error') ? 'empty' : 'filled'
    } else {
      return currentState === 'marked' ? 'empty' : 'marked'
    }
  }, [grid, currentPuzzle])

  /**
   * Handle cell click - apply action based on active input mode
   */
  const handleCellClick = useCallback((position: CellPosition) => {
    if (gameStatus !== 'playing' || !currentPuzzle || isDragging) return
    if (wasDraggingRef.current) return

    // Prevent double processing from race condition between pointer/drag and click handlers
    if (pointerHandledRef.current) {
      pointerHandledRef.current = false
      return
    }
    if (
      lastInteractionRef.current &&
      lastInteractionRef.current.row === position.row &&
      lastInteractionRef.current.col === position.col
    ) {
      lastInteractionRef.current = null
      return
    }
    lastInteractionRef.current = { row: position.row, col: position.col, timestamp: Date.now() }

    setSelectedCell(position)

    const currentState = grid[position.row][position.col]
    if (currentState === 'error') return

    const newState = applyCellAction(position, inputMode)
    if (newState === currentState) return

    // Only validate Fill mode - Mark mode (flags) can be placed anywhere
    // Skip validation if the cell is already an error (don't count same mistake twice)
    if (inputMode === 'fill' && newState === 'filled' && validationMode === 'assisted' && grid[position.row][position.col] !== 'error') {
      const tempGrid = grid.map(row => [...row])
      tempGrid[position.row][position.col] = newState
      const isMistake = isCellMistake(tempGrid, currentPuzzle.solution, position)

      if (isMistake) {
        // Count the mistake and check limit
        setMistakeCount((prev) => {
          const nextMistakes = prev + 1
          const limit = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 3 : 2
          if (nextMistakes >= limit) {
            setGameStatus('lost')
            clearGameState()
          }
          return nextMistakes
        })
        // Show error feedback permanently (don't revert)
        setMoveCount((prev) => prev + 1)
        setGrid((prevGrid) => {
          const newGrid = prevGrid.map((row) => [...row])
          newGrid[position.row][position.col] = 'error'
          return newGrid
        })
        return
      }
    }

    setMoveCount((prev) => prev + 1)
    setGrid((prevGrid) => {
      const newGrid = prevGrid.map((row) => [...row])
      newGrid[position.row][position.col] = newState
      return newGrid
    })
  }, [currentPuzzle, gameStatus, isDragging, inputMode, applyCellAction, validationMode, grid])

  /**
   * Drag handlers - for drag fill, drag cross, and drag erase
   */

  // Helper: Create cell key for visited tracking
  const getCellKey = (position: CellPosition): string => {
    return `${position.row}-${position.col}`
  }

  // Helper: Update the drag preview path
  const updateDragPreview = useCallback((currentPos: CellPosition) => {
    if (!dragStartPos.current || !currentPuzzle) return
    
    const key = `${currentPos.row}-${currentPos.col}`
    const path = dragPathRef.current

    // If hovering over the last cell again, do nothing
    if (path.length > 0 && path[path.length - 1] === key) return

    const existingIndex = path.indexOf(key)

    if (existingIndex !== -1) {
      // Backtracking: truncate the path to the existing index (removing cells drawn after it)
      path.length = existingIndex + 1
      setDragPreviewCells(new Set(path))
    } else {
      // New cell: check if it's lockable, if not, add it
      const cellState = grid[currentPos.row]?.[currentPos.col]
      const isLocked = cellState === 'filled' && currentPuzzle.solution[currentPos.row]?.[currentPos.col] === 1
      if (!isLocked) {
        path.push(key)
        setDragPreviewCells((prev) => {
          const next = new Set(prev)
          next.add(key)
          return next
        })
      }
    }
  }, [grid, currentPuzzle])

  // Start drag
  const handleDragStart = useCallback((position: CellPosition) => {
    if (gameStatus !== 'playing' || !currentPuzzle) return

    pointerHandledRef.current = true
    lastInteractionRef.current = { row: position.row, col: position.col, timestamp: Date.now() }

    const startState = grid[position.row]?.[position.col]
    const isLocked = startState === 'filled' && currentPuzzle.solution[position.row]?.[position.col] === 1
    if (isLocked) {
      // Correct solved cells are locked, do not allow starting a drag from them or modifying them
      return
    }

    setIsDragging(true)
    dragStartPos.current = position

    // Determine the action based on the starting cell state and inputMode
    let action: 'fill' | 'erase' | 'mark' | 'unmark'
    if (inputMode === 'fill') {
      action = (startState === 'filled' || startState === 'error') ? 'erase' : 'fill'
    } else {
      action = startState === 'marked' ? 'unmark' : 'mark'
    }
    dragActionRef.current = action
    setDragAction(action)

    // Set initial preview with the start cell
    const preview = new Set<string>()
    const startKey = `${position.row}-${position.col}`
    preview.add(startKey)
    setDragPreviewCells(preview)
    dragPathRef.current = [startKey]

    hasDraggedRef.current = false
  }, [currentPuzzle, gameStatus, grid, inputMode])

  // Continue drag
  const handleDragEnter = useCallback((position: CellPosition) => {
    if (!isDragging || !dragStartPos.current || !currentPuzzle || !dragActionRef.current) return
    updateDragPreview(position)
  }, [isDragging, currentPuzzle, updateDragPreview])

  // Handle pointer move - detect cell under pointer
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging) return

    // Get element under pointer
    const element = document.elementFromPoint(e.clientX, e.clientY)
    if (!element) return

    // Find the cell button element
    const cellButton = element.closest('button[data-cell-position]')
    if (!cellButton) return

    // Extract position from data attribute
    const positionData = cellButton.getAttribute('data-cell-position')
    if (!positionData) return

    const [row, col] = positionData.split('-').map(Number)
    if (isNaN(row) || isNaN(col)) return

    handleDragEnter({ row, col })
  }, [isDragging, handleDragEnter])

  // Setup global pointer move listener for drag
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove)
      return () => window.removeEventListener('pointermove', handlePointerMove)
    }
  }, [isDragging, handlePointerMove])

  // End drag - clean up drag state
  const handleDragEnd = useCallback(() => {
    if (!isDragging || !dragStartPos.current || !currentPuzzle || !dragActionRef.current) return

    wasDraggingRef.current = true
    setTimeout(() => {
      wasDraggingRef.current = false
    }, 100)

    const action = dragActionRef.current
    const previewCells = Array.from(dragPreviewCells)

    if (previewCells.length > 0) {
      const newGrid = grid.map((row) => [...row])
      let changedCount = 0
      let newMistakes = mistakeCount
      let lost = false

      for (const cellKey of previewCells) {
        const [row, col] = cellKey.split('-').map(Number)
        const currentState = grid[row]?.[col]

        // Double check locked status
        const isLocked = currentState === 'filled' && currentPuzzle.solution[row]?.[col] === 1
        if (isLocked) continue

        // Double check completed row/column status
        const isRowCompleted = rowValidation[row] === 'completed'
        const isColCompleted = columnValidation[col] === 'completed'
        if (isRowCompleted || isColCompleted) continue

        let cellNewState: CellState = currentState
        if (action === 'fill') {
          cellNewState = 'filled'
        } else if (action === 'erase') {
          cellNewState = 'empty'
        } else if (action === 'mark') {
          cellNewState = 'marked'
        } else if (action === 'unmark') {
          cellNewState = 'empty'
        }

          if (currentState === 'error') continue
          if (cellNewState === currentState) continue
          changedCount++

          // Validation logic for fill mode only (mark mode flags do not trigger mistakes)
          if (validationMode === 'assisted' && action === 'fill') {
            const isMistake = currentPuzzle.solution[row]?.[col] === 0;
            
            if (isMistake) {
              cellNewState = 'error'
              newMistakes += 1
              const limit = difficulty === 'easy' ? 5 : difficulty === 'medium' ? 3 : 2
              if (newMistakes >= limit) {
                lost = true
              }
            }
          }

        newGrid[row][col] = cellNewState
      }

      setGrid(newGrid)
      if (changedCount > 0) {
        setMoveCount((prev) => prev + changedCount)
      }
      if (newMistakes !== mistakeCount) {
        setMistakeCount(newMistakes)
      }
      if (lost) {
        setGameStatus('lost')
        clearGameState()
      }
    }

    setIsDragging(false)
    dragStartPos.current = null
    setDragPreviewCells(new Set())
    setDragAction(null)
    dragActionRef.current = null
  }, [isDragging, dragPreviewCells, grid, currentPuzzle, validationMode, mistakeCount, difficulty, rowValidation, columnValidation])

  /**
   * Reset the current puzzle
   */
  const resetPuzzle = useCallback(() => {
    if (currentPuzzle) {
      const emptyGrid = createEmptyGrid(currentPuzzle.size)
      setGrid(emptyGrid)
      setSelectedCell(null)
      setHoveredCell(null) // ✅ Clear hover state
      setSelectionHistory([])
      const initialSeconds = currentPuzzle.estimatedTime || getTimeLimitSeconds(difficulty)
      setElapsedSeconds(initialSeconds)
      setHintsUsed(0)
      setMistakeCount(0)
      setMoveCount(0)
      setGameStatus('playing')
      setRowValidation(Array(currentPuzzle.size).fill('incomplete'))
      setColumnValidation(Array(currentPuzzle.size).fill('incomplete'))
      setInputMode('fill')
      startTimeRef.current = null
      clearGameState()
      completionCalledRef.current = false
    }
  }, [currentPuzzle, difficulty])

  /**
   * Start a new puzzle
   */
  const newPuzzle = useCallback(async (puzzleId?: string, refresh = false) => {
    // Use current puzzle's difficulty, not URL or state
    // This ensures "New Puzzle" respects the mode you're currently playing
    const currentDiff = currentPuzzle?.difficulty || difficulty

    if (!getAccessToken()) ensureGuestId()

    // Replay/reset: the previous session must be closed server-side so the
    // fresh session is a NEW one — otherwise createSession dedupes onto the
    // old active session and the replay inherits its grid/mistakes/moves.
    if (sessionIdRef.current) {
      await abandonSession()
    } else {
      sessionIdRef.current = null
      sessionCreatedRef.current = false
      completionCalledRef.current = false
    }

    // Initialize puzzle with CURRENT difficulty
    initializePuzzle(currentDiff, false, puzzleId, refresh)
  }, [currentPuzzle, difficulty, initializePuzzle, abandonSession])

  /**
   * Replay the SAME puzzle: the server closes the previous session and opens a
   * fresh one so replay inherits no grid/mistakes/moves. Falls back to a plain
   * newPuzzle() on the same puzzle id if the fresh session can't be created.
   */
  const replayPuzzle = useCallback(async () => {
    if (!currentPuzzle) return
    const id = currentPuzzle.id

    const prevSessionId = sessionIdRef.current
    let replaySessionCreated = false
    if (prevSessionId) {
      try {
        const result = await gameApi.replayNonogramSession(prevSessionId)
        if (result && (result.sessionId || result._id || result.id)) {
          sessionIdRef.current = result.sessionId || result._id || result.id
          sessionCreatedRef.current = true
          replaySessionCreated = true
        }
      } catch { /* session replay failed → fall back below */ }
    }

    // Reset the board to the same puzzle dataset (identical clues/solution).
    resetPuzzle()

    if (!replaySessionCreated) {
      await newPuzzle(id, true)
    }
  }, [currentPuzzle, resetPuzzle, newPuzzle])

  /**
   * Change difficulty
   */
  const changeDifficulty = useCallback((newDifficulty: Difficulty, puzzleId?: string) => {
    setDifficulty(newDifficulty)

    if (!getAccessToken()) ensureGuestId()
    sessionIdRef.current = null
    sessionCreatedRef.current = false
    completionCalledRef.current = false

    initializePuzzle(newDifficulty, false, puzzleId)
  }, [initializePuzzle])

  /**
   * Use hint - reveal one correct cell
   */
  const useHint = useCallback(() => {
    if (!currentPuzzle || gameStatus !== 'playing') return
    if (hintsUsed >= maxHints) return

    const hintPosition = findHintPosition(grid, currentPuzzle.solution)
    if (!hintPosition) return

    setGrid((prevGrid) => {
      const newGrid = prevGrid.map((row) => [...row])
      newGrid[hintPosition.row][hintPosition.col] = 'filled'
      return newGrid
    })

    setHintsUsed((prev) => prev + 1)
    setSelectedCell(hintPosition)
  }, [currentPuzzle, grid, gameStatus, hintsUsed, maxHints])

  /**
   * Auto-fill - fill all cells correctly (for testing)
   */
  const autoFill = useCallback(() => {
    if (!currentPuzzle || gameStatus !== 'playing') return

    setGrid((prevGrid) => {
      const newGrid = prevGrid.map((row, rowIdx) =>
        row.map((_, colIdx) => {
          return currentPuzzle.solution[rowIdx][colIdx] === 1 ? 'filled' : 'empty'
        })
      )
      return newGrid
    })
  }, [currentPuzzle, gameStatus])

  /**
   * Reveal Solution - fill all cells correctly even if game is won/lost/ended
   */
  const revealSolution = useCallback(() => {
    if (!currentPuzzle) return

    setGrid(() => {
      return currentPuzzle.solution.map((row) =>
        row.map((val) => (val === 1 ? 'filled' : 'empty'))
      )
    })
  }, [currentPuzzle])

  /**
   * Keyboard controls with input mode support
   */
  useEffect(() => {
    if (gameStatus !== 'playing' || !currentPuzzle) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // F key - switch to Fill mode
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        setInputMode('fill')
        return
      }

      // M key - switch to Mark mode
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        setInputMode('mark')
        return
      }

      // Escape - abandon current session (works for guests too)
      if (e.key === 'Escape') {
        e.preventDefault()
        void abandonSession()
        return
      }

      // Arrow keys for navigation
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()

        const baseCell = hoveredCell || selectedCell

        if (!baseCell) {
          // Find first empty cell to start navigation
          let found = false
          for (let r = 0; r < currentPuzzle.size; r++) {
            for (let c = 0; c < currentPuzzle.size; c++) {
              if (grid[r][c] === 'empty') {
                setSelectedCell({ row: r, col: c })
                setHoveredCell({ row: r, col: c })
                found = true
                break
              }
            }
            if (found) break
          }
          return
        }

        let newRow = baseCell.row
        let newCol = baseCell.col
        let direction: 'up' | 'down' | 'left' | 'right' | null = null

        switch (e.key) {
          case 'ArrowUp':
            direction = 'up'
            break
          case 'ArrowDown':
            direction = 'down'
            break
          case 'ArrowLeft':
            direction = 'left'
            break
          case 'ArrowRight':
            direction = 'right'
            break
        }

        // Find next empty cell in the direction
        let attempts = 0
        const maxAttempts = currentPuzzle.size // Prevent infinite loop
        
        while (attempts < maxAttempts) {
          // Move in direction
          switch (direction) {
            case 'up':
              newRow = newRow > 0 ? newRow - 1 : currentPuzzle.size - 1
              break
            case 'down':
              newRow = newRow < currentPuzzle.size - 1 ? newRow + 1 : 0
              break
            case 'left':
              newCol = newCol > 0 ? newCol - 1 : currentPuzzle.size - 1
              break
            case 'right':
              newCol = newCol < currentPuzzle.size - 1 ? newCol + 1 : 0
              break
          }

          // Check if this cell is empty
          if (grid[newRow][newCol] === 'empty') {
            setSelectedCell({ row: newRow, col: newCol })
            setHoveredCell({ row: newRow, col: newCol })
            return
          }

          attempts++
          
          // If we've cycled back to starting position, stop
          if (newRow === baseCell.row && newCol === baseCell.col) {
            break
          }
        }

        // If no empty cell found, don't move
        return
      }


      // Space should NOT trigger cell action or navigation
      if (e.key === ' ') {
        e.preventDefault() // prevent page scroll, but do nothing else
        return
      }

      // Backspace or Delete to clear cell
      if (selectedCell && (e.key === 'Backspace' || e.key === 'Delete')) {
        e.preventDefault()
        const currentCellState = grid[selectedCell.row][selectedCell.col]
        if (currentCellState !== 'empty') {
          setGrid((prevGrid) => {
            const newGrid = prevGrid.map((row) => [...row])
            newGrid[selectedCell.row][selectedCell.col] = 'empty'
            return newGrid
          })
        } else {
          setSelectionHistory((prev) => {
            if (prev.length < 2) return prev
            const historyCopy = [...prev]
            historyCopy.pop() // Remove current cell
            const prevCell = historyCopy[historyCopy.length - 1]

            // Move selection/hover back to previous cell
            setSelectedCell(prevCell)
            setHoveredCell(prevCell)

            // Clear previous cell
            setGrid((prevGrid) => {
              const newGrid = prevGrid.map((row) => [...row])
              newGrid[prevCell.row][prevCell.col] = 'empty'
              return newGrid
            })
            return historyCopy
          })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedCell, hoveredCell, gameStatus, currentPuzzle, handleCellClick, grid])

  // Abandon the server session when the player loses (timer expired or mistake
  // limit hit), so the next puzzle starts a fresh session. Guest-aware.
  useEffect(() => {
    if (gameStatus === 'lost' && !lostAbandonedRef.current && sessionIdRef.current) {
      lostAbandonedRef.current = true
      void abandonSession()
    }
    if (gameStatus === 'playing') {
      lostAbandonedRef.current = false
    }
  }, [gameStatus])

  return {
    // State
    grid,
    selectedCell,
    hoveredCell,
    mousePosition,
    difficulty,
    currentPuzzle,
    isInitialized,
    loading,
    error,
    gameStatus,
    elapsedSeconds,
    rowValidation,
    columnValidation,
    progress,
    hintsUsed,
    maxHints,
    errorCell,
    mistakeCount,
    maxMistakes: difficulty === 'easy' ? 5 : difficulty === 'medium' ? 3 : 2,
    isDragging,
    dragPreviewCells,
    dragAction,
    inputMode,
    validationMode,

    // Actions
    handleCellClick,
    handleDragStart,
    handleDragEnter,
    handleDragEnd,
    handlePointerMove,
    resetPuzzle,
    newPuzzle,
    replayPuzzle,
    changeDifficulty,
    useHint,
    autoFill,
    revealSolution,
    setInputMode,
    setValidationMode,
    setHoveredCell,
    setMousePosition,
  }
}
