'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Cell, Difficulty, CrossMathPuzzle } from '@shared/lib/crossmath/types'
import { gameApi } from '@/lib/api/gameApi'
import { SCORING } from '@shared/lib/crossmath/constants'
import {
  isBoardComplete,
  getCorrectValue,
  validateBoard,
  calculateAvailableHints,
} from '@shared/lib/crossmath/helpers'
import {
  saveGameState,
  loadGameState,
  clearGameState,
} from '@shared/lib/crossmath/storage'
import { markPuzzleCompleted } from '@shared/lib/completion/universal'
import { updateChallengeStatus, getChallengeStatus } from '@shared/lib/dailyChallenge/storage'
import { getAccessToken, ensureGuestId } from '@/lib/auth/frontend-auth'

// Module-level guard to cancel StrictMode double-mount in dev
let _crossmathMountGuard = false

// Seconds between the last save and now — restores carry the elapsed time as
// of the last save, so the countdown must be advanced by this gap to resume
// from the exact moment the player left, not from the moment of the last save.
function savedGapSeconds(savedAt: unknown): number {
  if (savedAt == null) return 0
  const t = new Date(savedAt as string | number | Date).getTime()
  if (Number.isNaN(t)) return 0
  return Math.max(0, Math.round((Date.now() - t) / 1000))
}

function getTodayDateParam(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const y = String(d.getFullYear()).slice(-2)
  return `${m}-${day}-${y}`
}

const PUZZLE_CACHE_VERSION = 'v2'
const PUZZLE_CACHE_KEY = `puzzroo_crossmath_cache_by_id_${PUZZLE_CACHE_VERSION}`

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
      case 'hard': return 120
      case 'medium': return 180
      default: return 300
    }
  }

  const getInitialDifficulty = () => {
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
  const [loading, setLoading] = useState(true)

  const [history, setHistory] = useState<any[]>([])

  const pushToHistory = useCallback((
    position: { row: number; col: number },
    previousValue: number | string | undefined,
    previousType: Cell['type'],
    previousIsCorrect: boolean | undefined,
    previousIsError: boolean | undefined,
    scoreChange: number = 0
  ) => {
      setHistory(prev => [
        ...prev,
        {
          position,
          previousValue,
          previousType,
          previousIsCorrect,
          previousIsError,
          scoreChange,
        }
      ].slice(-30))
    }, [])

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const timeValueRef = useRef(getInitialTime(getInitialDifficulty()))
  const boardRef = useRef<Cell[][]>([])
  const difficultyRef = useRef<Difficulty>(getInitialDifficulty())
  const lastLocalSaveAtRef = useRef(Date.now())
  const sessionIdRef = useRef<string | null>(null)
  const sessionCreatedRef = useRef(false)
  const completionCalledRef = useRef(false)
  const hintsUsedRef = useRef(0)
  const mistakesRef = useRef(0)
  const movesRef = useRef(0)
  const scoreRef = useRef(0)
  const restoredRef = useRef(false)
  const cellMistakesRef = useRef<Map<string, Set<number>>>(new Map())

  // Single authoritative save pipeline: serialized, coalescing, never overlapping.
  // A save is only sent when the previous one completed; intermediate snapshots
  // are coalesced into the latest one, so no request is ever aborted.
  const saveQueueRef = useRef<{
    inFlight: boolean
    pending: { grid: Cell[][]; elapsed: number; hints: number; mists: number; diff: string; score: number } | null
  }>({ inFlight: false, pending: null })
  const drainPromiseRef = useRef<Promise<void> | null>(null)

  function gridToRecord(grid: Cell[][]): Record<string, number> {
    const record: Record<string, number> = {}
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const cell = grid[r][c]
        if (cell.isEditable && cell.type === 'number' && typeof cell.value === 'number') {
          record[`${r}-${c}`] = cell.value
        }
      }
    }
    return record
  }

  function elapsedFromCountdown(countdownTime: number, diff: string): number {
    return Math.max(0, getInitialTime(diff as Difficulty) - countdownTime)
  }

  async function initSession(puzzleId: string, diff: string, dailyChallenge = false, challengeId?: string): Promise<any> {
    if (sessionCreatedRef.current) return null
    movesRef.current = 0
    completionCalledRef.current = false
    if (typeof window === 'undefined') return null
    if (!getAccessToken()) {
      ensureGuestId()
    }
    try {
      const res = dailyChallenge && challengeId
        ? await gameApi.createDailyCrossMathSession(puzzleId, challengeId)
        : await gameApi.createSession('crossmath', puzzleId, diff)
      if (res && (res.sessionId || res._id || res.id)) {
        sessionIdRef.current = res.sessionId || res._id || res.id
        sessionCreatedRef.current = true
        movesRef.current = res.moves || 0
        hintsUsedRef.current = res.hintsUsed || 0
        return res
      }
    } catch { /* no session */ }
    return null
  }

  function restoreFromSession(sessionData: any, freshBoard: Cell[][], solution: Record<string, number | string>) {
    const g = sessionData.grid as Record<string, number>
    if (!g || Object.keys(g).length === 0) return null
    const restored = freshBoard.map(row => row.map(cell => ({ ...cell })))
    for (const [key, val] of Object.entries(g)) {
      const [r, c] = key.split('-').map(Number)
      const target = restored[r]?.[c]
      if (target && target.isEditable) {
        target.value = val
        target.type = 'number'
        const correctValue = getCorrectValue(solution as Record<string, number>, r, c)
        const isCorrect = correctValue !== null && val === correctValue
        target.isCorrect = isCorrect
        target.isError = !isCorrect
      }
    }
    return restored
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
              await gameApi.saveMove('crossmath', sessionIdRef.current!, {
                grid: gridToRecord(item.grid),
                elapsedTime: elapsedFromCountdown(item.elapsed, item.diff),
                hintsUsed: item.hints,
                mistakes: item.mists,
                moves: movesRef.current,
                score: item.score,
              })
            } catch (err) {
              // Network/server failure: drop the snapshot, keep local state.
              // The next save carries the full grid and self-heals the server.
              console.error('[crossmath] save move failed', err)
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

  function saveMoveNow(grid: Cell[][], elapsed: number, hints: number, mists: number, diff: string, score: number) {
    if (!sessionIdRef.current || completionCalledRef.current) return
    movesRef.current += 1
    saveQueueRef.current.pending = { grid, elapsed, hints, mists, diff, score }
    void drainSaveQueue()
  }

  async function completePuzzle(grid: Cell[][], elapsed: number, diff: string, finalScore?: number, finalMistakes?: number) {
    if (!sessionIdRef.current || completionCalledRef.current) return
    completionCalledRef.current = true
    try {
      // All pending saves must land before the terminal transition
      await drainSaveQueue()
      await gameApi.completeSession('crossmath', sessionIdRef.current, {
        grid: gridToRecord(grid),
        elapsedTime: elapsedFromCountdown(elapsed, diff),
        hintsUsed: hintsUsedRef.current,
        mistakes: finalMistakes ?? mistakes,
        moves: movesRef.current,
      })
    } catch { /* ignore */ }
  }

  async function failSession() {
    if (!sessionIdRef.current) return
    try {
      // All pending saves must land before the terminal transition
      await drainSaveQueue()
      await gameApi.abandonCrossMathSession(sessionIdRef.current)
    } catch { /* ignore */ }
  }

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

  function isValidPuzzle(p: any): p is CrossMathPuzzle {
    if (!p || !Array.isArray(p.grid) || p.grid.length === 0 || !p.solution) return false
    const hasEditable = p.grid.flat().some((c: any) => c.isEditable)
    if (!hasEditable) console.warn('[crossmath] cached puzzle has 0 editable cells, rejecting')
    return hasEditable
  }

  useEffect(() => {
    // StrictMode double-mount guard: skip first mount in dev
    if (process.env.NODE_ENV === 'development' && !_crossmathMountGuard) {
      _crossmathMountGuard = true
      return
    }

    let cancelled = false
      ; (async () => {
        if (restoredRef.current) {
          setLoading(false)
          return
        }
        setLoading(true)
        try {
          const savedGame = loadGameState(undefined, difficultyParam)

          const dcId = isDailyChallenge ? `daily-cross-math-${dateParam || getTodayDateParam()}` : undefined
          const continueResult = isDailyChallenge && dcId
            ? await gameApi.getContinueDailyCrossMath(dcId).catch(() => null)
            : await gameApi.getContinueCrossMath(difficultyParam).catch(() => null)
          const serverSession = continueResult?.hasActiveSession ? continueResult.session : null
          if (serverSession && serverSession.sessionId && (serverSession as any).puzzle) {
            const serverPuzzle = (serverSession as any).puzzle
            if (serverPuzzle && isValidPuzzle(serverPuzzle)) {
              setCurrentPuzzle(serverPuzzle)
              writePuzzleCache(serverPuzzle)

              const freshBoard = serverPuzzle.grid.map((row: any[]) => row.map((cell: any) => ({ ...cell })))
              const savedGrid = serverSession.grid || {}
              for (const [key, val] of Object.entries(savedGrid)) {
                const [r, c] = key.split('-').map(Number)
                const target = freshBoard[r]?.[c]
                if (target && target.isEditable) {
                  target.value = val as number
                  target.type = 'number'
                  const correctValue = getCorrectValue(serverPuzzle.solution, r, c)
                  const isCorrect = correctValue !== null && val === correctValue
                  target.isCorrect = isCorrect
                  target.isError = !isCorrect
                }
              }

              setBoard(freshBoard)
              setMistakes(serverSession.mistakes || 0)
              setScore(serverSession.score || 0)
              // Local autosave runs every second — fresher than the server
              // elapsed (saved on moves / close-flush). Prefer it when it
              // matches the same puzzle so the countdown resumes exactly
              // where it paused, even if the close-flush was lost.
              const localElapsed = savedGame && savedGame.puzzleId === serverSession.puzzleId
                ? getInitialTime((serverSession.difficulty || difficulty) as Difficulty) - savedGame.time
                : null
              setTime(Math.max(0, getInitialTime((serverSession.difficulty || difficulty) as Difficulty) - (localElapsed ?? (serverSession.elapsedTime || 0))))
              setGameStatus((serverSession.sessionStatus === 'paused' ? 'playing' : serverSession.sessionStatus || 'playing') as 'playing' | 'won' | 'lost')
              if (serverSession.difficulty) setDifficulty(serverSession.difficulty as Difficulty)
             setSelectedCell(null)
              setIsTyping(false)
              setHistory(savedGame?.history || [])
              clearGameState()
              cellMistakesRef.current.clear()

              sessionIdRef.current = serverSession.sessionId
              sessionCreatedRef.current = true
              movesRef.current = serverSession.moves || 0
              hintsUsedRef.current = serverSession.hintsUsed || 0

              const limit = (serverSession.difficulty || difficulty) === 'hard' ? 2 : serverPuzzle.maxMistakes
              setMaxMistakes(limit)
              setAvailableNumbers(new Set(serverPuzzle.availableNumbers))

              const usedCount = new Map<number, number>()
              freshBoard.forEach((row: any[]) => {
                row.forEach((cell: any) => {
                  if (cell.isEditable && cell.type === 'number' && typeof cell.value === 'number') {
                    const current = usedCount.get(cell.value) || 0
                    usedCount.set(cell.value, current + 1)
                  }
                })
              })
              setUsedNumbersCount(usedCount)

              if (!cancelled) setLoading(false)
              restoredRef.current = true
              return
            }
          }

          let puzzle: CrossMathPuzzle | null = null

          if (puzzleId) {
            const cached = readPuzzleCache(puzzleId)
            if (cached) {
              puzzle = cached
            } else {
              try {
                const resp = await gameApi.getPuzzleById('crossmath', puzzleId)
                if (isValidPuzzle(resp)) {
                  puzzle = resp as unknown as CrossMathPuzzle
                  writePuzzleCache(puzzle)
                }
              } catch {
                // api failed
              }
            }
          } else if (isDailyChallenge) {
            try {
              const targetDiff = difficultyParam || difficulty
              const resp = await gameApi.getDailyPuzzle('crossmath', getDailyDateString(dateParam), targetDiff)
              if (isValidPuzzle(resp)) {
                puzzle = resp as unknown as CrossMathPuzzle
              }
            } catch {
              // api failed
            }
          } else {
            if (savedGame && savedGame.difficulty === difficulty) {
              const resumeId = savedGame.puzzleId
              try {
                const cached = readPuzzleCache(resumeId)
                if (isValidPuzzle(cached)) {
                  puzzle = cached
                } else {
                  const resp = await gameApi.getPuzzleById('crossmath', resumeId)
                  if (isValidPuzzle(resp)) puzzle = resp as unknown as CrossMathPuzzle
                }
              } catch {
                // api failed
              }
            } else {
              try {
                const resp = await gameApi.getPuzzle('crossmath', { difficulty })
                if (isValidPuzzle(resp)) {
                  puzzle = resp as unknown as CrossMathPuzzle
                }
              } catch {
                // api failed
              }
            }
          }

          if (cancelled || !puzzle) {
            return
          }
          writePuzzleCache(puzzle)

          const targetPuzzleId = isDailyChallenge && dateParam ? `daily-cross-math-${dateParam}` : puzzle.id

          if (savedGame && savedGame.puzzleId === targetPuzzleId && savedGame.difficulty === difficulty) {
            // Rebuild board from fresh puzzle grid, merge saved user inputs
            const freshBoard = puzzle.grid.map(row => row.map(cell => ({ ...cell })))
            for (const savedRow of savedGame.board) {
              for (const savedCell of savedRow) {
                if (savedCell.isEditable && savedCell.value !== undefined && savedCell.value !== null) {
                  const target = freshBoard[savedCell.row]?.[savedCell.col]
                  if (target && target.isEditable) {
                    target.value = savedCell.value
                    target.type = savedCell.type
                    target.isCorrect = savedCell.isCorrect
                    target.isError = savedCell.isError
                  }
                }
              }
            }
            setBoard(freshBoard)
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
            freshBoard.forEach(row => {
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
            const targetDiff = (puzzle.difficulty || difficultyParam || difficulty) as Difficulty
            if (puzzle.difficulty && puzzle.difficulty !== difficulty) {
              setDifficulty(puzzle.difficulty as Difficulty)
            }
            const limit = targetDiff === 'hard' ? 2 : puzzle.maxMistakes
            setMaxMistakes(limit)
            setAvailableNumbers(new Set(puzzle.availableNumbers))
            setUsedNumbersCount(new Map())
            setMistakes(0)
            setScore(0)
            setTime(getInitialTime(targetDiff))
            setGameStatus('playing')
            setSelectedCell(null)
            setIsTyping(false)
            setHistory([])
            clearGameState(undefined, targetDiff)
            cellMistakesRef.current.clear()
            const sessionData = await initSession(puzzle.id, targetDiff, isDailyChallenge, dcId)
            if (sessionData && !savedGame) {
              const restored = restoreFromSession(sessionData, puzzle.grid, puzzle.solution)
              if (restored) {
                setBoard(restored)
                setMistakes(sessionData.mistakes || 0)
                setScore(sessionData.score || 0)
                setTime(Math.max(0, getInitialTime(targetDiff) - (sessionData.elapsedTime || 0)))
                const usedCount = new Map<number, number>()
                restored.forEach(row => {
                  row.forEach(cell => {
                    if (cell.isEditable && cell.type === 'number' && typeof cell.value === 'number') {
                      const current = usedCount.get(cell.value) || 0
                      usedCount.set(cell.value, current + 1)
                    }
                  })
                })
                setUsedNumbersCount(usedCount)
              }
            }
          }
          if (savedGame && puzzle) {
            await initSession(puzzle.id, difficulty, isDailyChallenge, dcId)
          }
        } catch {
          // Unexpected error during puzzle load — board stays empty
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()

    return () => {
      cancelled = true
      if (process.env.NODE_ENV === 'development') _crossmathMountGuard = false
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
         history,
       }, undefined, difficulty)
      timeValueRef.current = time
      boardRef.current = board
      difficultyRef.current = difficulty
      mistakesRef.current = mistakes
      scoreRef.current = score
      lastLocalSaveAtRef.current = Date.now()
    }
  }, [board, difficulty, mistakes, score, time, gameStatus, currentPuzzle, history])

  /**
   * Flush the exact close-moment elapsed time to the server when the page is
   * closed or hidden (tab close, navigation, back button). Server saves only
   * run on moves, so without this the restored countdown would rewind to the
   * last move. Restores use the stored elapsed as-is (timer pauses while away).
   */
  useEffect(() => {
    if (gameStatus !== 'playing' || board.length === 0) return

    const flushElapsed = () => {
      if (!sessionIdRef.current || completionCalledRef.current) return
      if (boardRef.current.length === 0) return
      const elapsed = elapsedFromCountdown(timeValueRef.current, difficultyRef.current) + savedGapSeconds(lastLocalSaveAtRef.current)
      Promise.resolve(gameApi.saveMove('crossmath', sessionIdRef.current, {
        grid: gridToRecord(boardRef.current),
        elapsedTime: elapsed,
        hintsUsed: hintsUsedRef.current,
        mistakes: mistakesRef.current,
        moves: movesRef.current,
        score: scoreRef.current,
      })).catch(() => { /* best-effort close flush */ })
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushElapsed()
    }
    window.addEventListener('pagehide', flushElapsed)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flushElapsed)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [gameStatus, board.length])

  // Update challenge status to in-progress when game is loaded
  useEffect(() => {
    if (board.length > 0 && isDailyChallenge) {
      const challengeId = dateParam ? `daily-cross-math-${dateParam}` : `daily-cross-math-${getTodayDateParam()}`
      const currentStatus = getChallengeStatus(challengeId)
      if (currentStatus !== 'completed') {
        updateChallengeStatus(challengeId, 'in-progress')
      }
    }
  }, [board.length, isDailyChallenge, dateParam])

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
            void failSession()
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

    // Save move in history stack for undo (include score change for undo)
    // We calculate what score change will happen: correct = +CORRECT_ANSWER, wrong = +WRONG_ANSWER (negative)
    const correctValueForHistory = getCorrectValue(currentPuzzle.solution, row, col)
    const willBeCorrect = correctValueForHistory !== null && num === correctValueForHistory
    const scoreChangeForHistory = willBeCorrect ? SCORING.CORRECT_ANSWER : SCORING.WRONG_ANSWER
    pushToHistory(
      { row, col },
      typeof cell.value === 'number' ? cell.value : undefined,
      cell.type,
      cell.isCorrect,
      cell.isError,
      scoreChangeForHistory
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
    saveMoveNow(newBoard, time, hintsUsedRef.current, isCorrect ? mistakes : mistakes + 1, difficulty, score)

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
      const cellKey = `${row}-${col}`
      const cellMistakes = cellMistakesRef.current.get(cellKey) || new Set<number>()
      const isDuplicateMistake = cellMistakes.has(num)
      
      if (!isDuplicateMistake) {
        cellMistakes.add(num)
        cellMistakesRef.current.set(cellKey, cellMistakes)
        
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
          void failSession()
          return
        }
      }
    }

    // Check win condition
    if (isBoardComplete(newBoard) && validateBoard(newBoard, currentPuzzle.solution)) {
      // Mark puzzle as completed in universal completion system
      const dateParam = searchParams.get('date')
      const puzzleId = dateParam ? `daily-cross-math-${dateParam}` : currentPuzzle.id
      markPuzzleCompleted('crossmath', puzzleId, {
        time: time,
        score: score + SCORING.CORRECT_ANSWER,
        difficulty: difficulty,
      })
      if (isDailyChallenge) {
        updateChallengeStatus(puzzleId, 'completed')
      }
      completePuzzle(newBoard, time, difficulty)

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
      saveMoveNow(newBoard, time, hintsUsedRef.current, mistakes, difficulty, score)
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
    saveMoveNow(newBoard, time, hintsUsedRef.current, isCorrect ? mistakes : mistakes + 1, difficulty, score)

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
      const cellKey = `${row}-${col}`
      const cellMistakes = cellMistakesRef.current.get(cellKey) || new Set<number>()
      const isDuplicateMistake = cellMistakes.has(num)
      
      if (!isDuplicateMistake) {
        cellMistakes.add(num)
        cellMistakesRef.current.set(cellKey, cellMistakes)
        
        const newScore = Math.max(0, score + SCORING.WRONG_ANSWER)
        setScore(newScore)
        triggerScoreFeedback(SCORING.WRONG_ANSWER)

        const newMistakes = mistakes + 1
        setMistakes(newMistakes)

        if (newMistakes >= maxMistakes) {
          setGameStatus('lost')
          setSelectedCell(null)
          clearGameState()
          void failSession()
          return
        }
      }
    }

    // Check win condition
    if (isBoardComplete(newBoard) && validateBoard(newBoard, currentPuzzle.solution)) {
      // Mark puzzle as completed in universal completion system
      const dateParam = searchParams.get('date')
      const puzzleId = dateParam ? `daily-cross-math-${dateParam}` : currentPuzzle.id
      markPuzzleCompleted('crossmath', puzzleId, {
        time: time,
        score: score + SCORING.CORRECT_ANSWER,
        difficulty: difficulty,
      })
      completePuzzle(newBoard, time, difficulty)

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
    saveMoveNow(newBoard, time, hintsUsedRef.current, mistakes, difficulty, score)
    setIsTyping(false)
  }, [selectedCell, board, gameStatus, usedNumbersCount, pushToHistory])

  const undoLastMove = useCallback(() => {
    if (history.length === 0 || gameStatus !== 'playing') return

    const lastMove = history[history.length - 1]
    const { position, previousValue, previousType, previousIsCorrect, previousIsError, scoreChange } = lastMove
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

    // Revert score: undo the score change that was applied when this move was made
    if (scoreChange !== 0) {
      setScore(prev => Math.max(0, prev - scoreChange))
    }

    setBoard(newBoard)
    setHistory(prev => prev.slice(0, -1)) // Pop the stack
    setIsTyping(false)
  }, [history, board, gameStatus, usedNumbersCount])

  const replayBoard = useCallback(async () => {
    if (!currentPuzzle) return
    const id = currentPuzzle.id

    const prevSessionId = sessionIdRef.current
    let replaySessionCreated = false
    if (prevSessionId) {
      try {
        const result = await gameApi.replayCrossMathSession(prevSessionId, currentPuzzle.id)
        if (result && result.sessionId) {
          sessionIdRef.current = result.sessionId
          sessionCreatedRef.current = true
          replaySessionCreated = true
        }
      } catch { }
    }

    let puzzle: CrossMathPuzzle | undefined
    try {
      const cached = readPuzzleCache(id)
      if (isValidPuzzle(cached)) {
        puzzle = cached
      } else {
        const resp = await gameApi.getPuzzleById('crossmath', id)
        if (isValidPuzzle(resp)) puzzle = resp as unknown as CrossMathPuzzle
      }
    } catch { }
    if (!puzzle) puzzle = currentPuzzle
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
    completionCalledRef.current = false
    movesRef.current = 0
    hintsUsedRef.current = 0

    if (!replaySessionCreated) {
      sessionCreatedRef.current = false
      sessionIdRef.current = null
      if (!getAccessToken()) ensureGuestId()
      const dcId = isDailyChallenge ? `daily-cross-math-${dateParam || getTodayDateParam()}` : undefined
      await initSession(id, difficulty, isDailyChallenge, dcId)
    }
  }, [currentPuzzle, difficulty])

  const resetBoard = useCallback(async () => {
    let puzzle: CrossMathPuzzle | undefined
    try {
      const resp = isDailyChallenge
        ? await gameApi.getDailyPuzzle('crossmath', getDailyDateString(dateParam))
        : await gameApi.getPuzzle('crossmath', { difficulty })
      if (isValidPuzzle(resp)) puzzle = resp as unknown as CrossMathPuzzle
    } catch {
      // api failed
    }
    if (!puzzle) {
      return
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
    completionCalledRef.current = false
    movesRef.current = 0
    hintsUsedRef.current = 0
    sessionCreatedRef.current = false
    sessionIdRef.current = null
    if (!getAccessToken()) ensureGuestId()
    const dcId = isDailyChallenge ? `daily-cross-math-${dateParam || getTodayDateParam()}` : undefined
    await initSession(puzzle.id, difficulty, isDailyChallenge, dcId)
  }, [difficulty, usePatternMode, isDailyChallenge, dateParam])

  const requestHint = useCallback(() => {
    if (gameStatus !== 'playing' || !currentPuzzle) return

    const availableHints = calculateAvailableHints(score)
    if (availableHints <= 0) return

    // Find best target cell — prefer selected cell if it's editable and not already correct
    let targetCell: { row: number; col: number } | null = null

    if (selectedCell) {
      const cell = board[selectedCell.row]?.[selectedCell.col]
      if (cell && cell.isEditable && (!cell.value || cell.isError || !cell.isCorrect)) {
        targetCell = selectedCell
      }
    }

    // Fall back to finding any empty or incorrect cell on the board
    if (!targetCell) {
      const emptyOrIncorrect: { row: number; col: number }[] = []
      for (let r = 0; r < board.length; r++) {
        for (let c = 0; c < board[r].length; c++) {
          const cell = board[r][c]
          if (cell.isEditable && (!cell.value || cell.isError || !cell.isCorrect)) {
            emptyOrIncorrect.push({ row: r, col: c })
          }
        }
      }
      if (emptyOrIncorrect.length > 0) {
        const randIdx = Math.floor(Math.random() * emptyOrIncorrect.length)
        targetCell = emptyOrIncorrect[randIdx]
      }
    }

    if (!targetCell) return

    const { row, col } = targetCell
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
    hintsUsedRef.current += 1
    saveMoveNow(newBoard, time, hintsUsedRef.current, mistakes, difficulty, score)

    // Track number usage
    const newUsedCount = new Map(usedNumbersCount)
    const cell = board[row][col]
    if (cell.type === 'number' && typeof cell.value === 'number') {
      const prevCount = newUsedCount.get(cell.value) || 0
      if (prevCount > 0) {
        newUsedCount.set(cell.value, prevCount - 1)
      }
    }
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
      const dateParam = searchParams.get('date')
      const puzzleId = dateParam ? `daily-cross-math-${dateParam}` : currentPuzzle.id
      markPuzzleCompleted('crossmath', puzzleId, {
        time: time,
        score: newScore,
        difficulty: difficulty,
      })
      completePuzzle(newBoard, time, difficulty)

      setSelectedCell(null)
      setIsTyping(false)
      setGameStatus('won')
      clearGameState()
    }
  }, [board, gameStatus, score, usedNumbersCount, currentPuzzle, time, difficulty, searchParams, selectedCell, mistakes])

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

      if (requiredCount > 0 && adjustedUsedCount >= requiredCount) {
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
        saveMoveNow(newBoard, time, hintsUsedRef.current, mistakes, difficulty, score)
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
      saveMoveNow(newBoard, time, hintsUsedRef.current, isCorrect ? mistakes : mistakes + 1, difficulty, score)

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
          void failSession()
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
        if (isDailyChallenge) {
          updateChallengeStatus(puzzleId, 'completed')
        }
        completePuzzle(newBoard, time, difficulty)

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
  }, [board, selectedCell, gameStatus, isTyping, usedNumbersCount, score, mistakes, maxMistakes, currentPuzzle, requiredNumbersCount])

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
              type: newValStr !== '' ? cell.type : 'empty',
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
