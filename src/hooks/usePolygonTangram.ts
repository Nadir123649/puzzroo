/**
 * Polygon-Based Tangram Hook
 * Uses standard Tangram piece shapes in tray, polygon datasets for solution
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { markPuzzleCompleted } from '@shared/lib/completion/universal'
import { PolygonPuzzle, TangramPieceId } from '@shared/types/tangram-polygon'
type TangramDifficulty = 'easy' | 'medium' | 'hard'
import { updateChallengeStatus, getChallengeStatus } from '@shared/lib/dailyChallenge/storage'

// Module-level guard to cancel StrictMode double-mount in dev
let _tangramMountGuard = false

function getTodayDateParam(): string {
  const d = new Date()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  const y = String(d.getUTCFullYear()).slice(-2)
  return `${m}-${day}-${y}`
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

import { gameApi } from '@/lib/api/gameApi'
import { scaleAndCenterPolygon } from '@shared/lib/tangram/polygon-renderer'
import { calculateCentroid, polygonToPoints } from '@shared/lib/tangram/polygon-geometry'
import { validatePuzzle } from '@shared/lib/tangram/polygon-validation'
import { attemptSnap, geometricallyMatches } from '@shared/lib/tangram/polygon-snapping'
import { PIECE_CONFIG } from '@shared/lib/tangram/pieceConfig'
import { ensureGuestId, getCurrentUser } from '@/lib/auth/frontend-auth'

const PIECE_COLORS: Record<TangramPieceId, string> = {
  baseTriangle1: '#4A90E2',
  baseTriangle2: '#5C6BC0',
  mediumTriangle: '#F4A261',
  smallTriangle1: '#E76F51',
  smallTriangle2: '#2A9D8F',
  square: '#E63946',
  parallelogram: '#78C2AD'
}

// Map polygon IDs to standard piece types
const PIECE_TYPE_MAP: Record<string, keyof typeof PIECE_CONFIG> = {
  'baseTriangle1': 'large-triangle-1',
  'baseTriangle2': 'large-triangle-2',
  'mediumTriangle': 'medium-triangle',
  'smallTriangle1': 'small-triangle-1',
  'smallTriangle2': 'small-triangle-2',
  'square': 'square',
  'parallelogram': 'parallelogram'
}

const TANG_CACHE_KEY = 'puzzroo_tangram_cache_by_id'

const readCache = (id: string): PolygonPuzzle | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(TANG_CACHE_KEY)
    if (!raw) return null
    const map = JSON.parse(raw) as Record<string, PolygonPuzzle>
    return map[id] || null
  } catch {
    return null
  }
}

const writeCache = (p: PolygonPuzzle): void => {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(TANG_CACHE_KEY)
    const map = raw ? (JSON.parse(raw) as Record<string, PolygonPuzzle>) : {}
    map[p.id] = p
    localStorage.setItem(TANG_CACHE_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

const DUMMY_TANGRAM_PUZZLE: PolygonPuzzle = {
  id: '',
  sourceId: '',
  difficulty: 'easy',
  pieceShapeIds: [],
  individualPiecePolygons: [],
  fullPolygon: [],
  gameType: 'tangram',
  active: false,
}

interface PieceState {
  id: TangramPieceId
  basePolygon: number[][]
  currentPolygon: number[][]
  targetPolygon: number[][]
  transform: { x: number; y: number; rotation: number }
  color: string
  isPlaced: boolean
  isSnapped: boolean
}

const getTargetRotation = (pieceType: string, scaledTarget: number[][], scale: number): number => {
  const puzzleUnit = 5 * scale

  const basePolygons: Record<string, number[][]> = {
    'large-triangle-1': [[0, 0], [puzzleUnit * 2, 0], [0, puzzleUnit * 2], [0, 0]],
    'large-triangle-2': [[0, 0], [puzzleUnit * 2, 0], [0, puzzleUnit * 2], [0, 0]],
    'medium-triangle': [[0, 0], [puzzleUnit * Math.SQRT2, 0], [0, puzzleUnit * Math.SQRT2], [0, 0]],
    'small-triangle-1': [[0, 0], [puzzleUnit, 0], [0, puzzleUnit], [0, 0]],
    'small-triangle-2': [[0, 0], [puzzleUnit, 0], [0, puzzleUnit], [0, 0]],
    'square': [[0, 0], [puzzleUnit, 0], [puzzleUnit, puzzleUnit], [0, puzzleUnit], [0, 0]],
    'parallelogram': [[0, puzzleUnit], [puzzleUnit, 0], [puzzleUnit * 2, 0], [puzzleUnit, puzzleUnit], [0, puzzleUnit]]
  }

  const base = basePolygons[pieceType]
  if (!base || base.length === 0 || scaledTarget.length === 0) return 0

  // Calculate centroid of scaledTarget
  const targetCx = scaledTarget.reduce((sum, p) => sum + p[0], 0) / scaledTarget.length
  const targetCy = scaledTarget.reduce((sum, p) => sum + p[1], 0) / scaledTarget.length
  const centeredTarget = scaledTarget.map(([x, y]) => [x - targetCx, y - targetCy])

  // If it's a parallelogram, check standard AND mirrored bases
  const baseOptions = [base]
  if (pieceType === 'parallelogram') {
    const baseMirrored = [[0, 0], [puzzleUnit, 0], [puzzleUnit * 2, puzzleUnit], [puzzleUnit, puzzleUnit], [0, 0]]
    baseOptions.push(baseMirrored)
  }

  for (const currentBase of baseOptions) {
    const baseAvgX = currentBase.reduce((sum, p) => sum + p[0], 0) / currentBase.length
    const baseAvgY = currentBase.reduce((sum, p) => sum + p[1], 0) / currentBase.length

    // Test 8 possible rotations (0, 45, 90, 135, 180, 225, 270, 315)
    for (let r = 0; r < 360; r += 45) {
      const radians = (r * Math.PI) / 180
      const cos = Math.cos(radians)
      const sin = Math.sin(radians)

      const rotated = currentBase.map(([x, y]) => {
        const dx = x - baseAvgX
        const dy = y - baseAvgY
        return [
          dx * cos - dy * sin,
          dx * sin + dy * cos
        ]
      })

      let allMatched = true
      for (const [tx, ty] of centeredTarget) {
        const hasMatch = rotated.some(([rx, ry]) => {
          const dx = rx - tx
          const dy = ry - ty
          return Math.sqrt(dx * dx + dy * dy) < 5.0
        })
        if (!hasMatch) {
          allMatched = false
          break
        }
      }

      if (allMatched) {
        return r
      }
    }
  }

  return 0
}

const areStatesEqual = (state1: PieceState[], state2: PieceState[]) => {
  if (!state1 || !state2) return false
  if (state1.length !== state2.length) return false
  return state1.every((p, i) => {
    const p2 = state2[i]
    if (!p2) return false
    return (
      p.id === p2.id &&
      Math.abs(p.transform.x - p2.transform.x) < 0.1 &&
      Math.abs(p.transform.y - p2.transform.y) < 0.1 &&
      p.transform.rotation === p2.transform.rotation &&
      p.isPlaced === p2.isPlaced &&
      p.isSnapped === p2.isSnapped
    )
  })
}

export function usePolygonTangram(difficulty: TangramDifficulty = 'easy') {
  const searchParams = useSearchParams()
  const dateParam = searchParams?.get('date')
  const isDailyChallenge = !!dateParam || (typeof window !== 'undefined' && window.location.pathname.includes('/daily-challenge/'))

  const [puzzle, setPuzzle] = useState<PolygonPuzzle | null>(null)
  const getInitialTime = (diff: TangramDifficulty) => {
    switch (diff) {
      case 'hard': return 120    // 2 minutes
      case 'medium': return 180  // 3 minutes
      default: return 300        // 5 minutes (easy)
    }
  }

  const [pieces, setPieces] = useState<PieceState[]>([])
  const [selectedPiece, setSelectedPiece] = useState<TangramPieceId | null>(null)
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing')
  const [timeRemaining, setTimeRemaining] = useState(() => getInitialTime(difficulty))
  const [score, setScore] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [hintPiece, setHintPiece] = useState<TangramPieceId | null>(null)
  const [moveHistory, setMoveHistory] = useState<PieceState[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [hasWonOnce, setHasWonOnce] = useState(false)
  const [loading, setLoading] = useState(true)

  const moveHistoryRef = useRef<PieceState[][]>([])
  const historyIndexRef = useRef(-1)
  const puzzleRef = useRef<PolygonPuzzle | null>(puzzle)
  const isReplayingRef = useRef(false)

  // Keep refs in sync with state
  useEffect(() => {
    moveHistoryRef.current = moveHistory
  }, [moveHistory])
  useEffect(() => {
    historyIndexRef.current = historyIndex
  }, [historyIndex])

  useEffect(() => {
    puzzleRef.current = puzzle
  }, [puzzle])

  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const shownHints = useRef<Set<TangramPieceId>>(new Set())
  const scaledData = useRef<ReturnType<typeof scaleAndCenterPolygon> | null>(null)
  const lastCommittedStateRef = useRef<PieceState[] | null>(null)
  const timeRemainingRef = useRef(timeRemaining)
  const hintsUsedRef = useRef(hintsUsed)
  const piecesRef = useRef<PieceState[]>(pieces)

  useEffect(() => {
    timeRemainingRef.current = timeRemaining
  }, [timeRemaining])
  useEffect(() => {
    hintsUsedRef.current = hintsUsed
  }, [hintsUsed])
  useEffect(() => {
    piecesRef.current = pieces
  }, [pieces])

  const sessionIdRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const sessionCreatedRef = useRef(false)
  const completionCalledRef = useRef(false)
  const serverRestoreRef = useRef<{ pieceStates: any[]; elapsedSeconds: number; hintsUsed: number } | null>(null)

  // Converts a screen-space piece state to the dataset coordinate space the
  // server verifies in: screen = dataset * scale + offset. The position sent
  // is the translation that, applied to the dataset polygon, reproduces the
  // screen placement: t = (screenCentroid - offset) / scale - R(r) * centroid(original).
  function piecesToRecord(pieces: PieceState[]): any[] {
    const scaled = scaledData.current
    const currentPuzzle = puzzleRef.current
    return pieces.map(p => {
      let position = { x: p.transform.x, y: p.transform.y }
      if (scaled && currentPuzzle && Array.isArray(currentPuzzle.individualPiecePolygons)) {
        const idx = currentPuzzle.pieceShapeIds.indexOf(p.id)
        const original = idx >= 0 ? currentPuzzle.individualPiecePolygons[idx] : null
        if (original && Array.isArray(original) && original.length > 0) {
          const rad = (p.transform.rotation * Math.PI) / 180
          const cos = Math.cos(rad)
          const sin = Math.sin(rad)
          const oc = calculateCentroid(polygonToPoints(original))
          const rcX = oc.x * cos - oc.y * sin
          const rcY = oc.x * sin + oc.y * cos
          position = {
            x: (p.transform.x - scaled.offsetX) / scaled.scale - rcX,
            y: (p.transform.y - scaled.offsetY) / scaled.scale - rcY,
          }
        }
      }
      return {
        pieceId: p.id,
        position,
        rotation: p.transform.rotation,
        flipped: false,
        placed: p.isPlaced,
        snapped: p.isSnapped,
      }
    })
  }

  // Inverse of piecesToRecord: dataset-space state back to screen centroid.
  function stateToScreen(savedPiece: any, p: PieceState): { tx: number; ty: number } {
    const scaled = scaledData.current
    const pos = savedPiece.position || { x: 0, y: 0 }
    if (!scaled) return { tx: pos.x, ty: pos.y }
    const rad = ((savedPiece.rotation ?? 0) * Math.PI) / 180
    const cos = Math.cos(rad)
    const sin = Math.sin(rad)
    const idx = puzzleRef.current?.pieceShapeIds?.indexOf(p.id) ?? -1
    const original = idx >= 0 ? puzzleRef.current?.individualPiecePolygons?.[idx] : null
    const oc = original ? calculateCentroid(polygonToPoints(original)) : { x: 0, y: 0 }
    return {
      tx: (pos.x + (oc.x * cos - oc.y * sin)) * scaled.scale + scaled.offsetX,
      ty: (pos.y + (oc.x * sin + oc.y * cos)) * scaled.scale + scaled.offsetY,
    }
  }

  function elapsedFromCountdown(countdownTime: number, diff: TangramDifficulty): number {
    return Math.max(0, getInitialTime(diff) - countdownTime)
  }

  async function initSession(puzzleId: string, diff: string, dailyChallenge = false, challengeId?: string): Promise<any> {
    if (sessionCreatedRef.current) return null
    completionCalledRef.current = false
    if (typeof window === 'undefined') return null
    ensureGuestId()
    try {
      const res = dailyChallenge && challengeId
        ? await gameApi.createDailySession('tangram', puzzleId, challengeId)
        : await gameApi.createSession('tangram', puzzleId, diff)
      if (res && (res.sessionId || res._id || res.id)) {
        sessionIdRef.current = res.sessionId || res._id || res.id
        sessionCreatedRef.current = true
        return res
      }
    } catch { /* no session */ }
    return null
  }

  function saveMoveNow(pieces: PieceState[], elapsed: number, hints: number) {
    if (!sessionIdRef.current) return
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    const pieceStates = piecesToRecord(pieces)
    gameApi.saveMove('tangram', sessionIdRef.current, {
      pieceStates,
      elapsedSeconds: elapsed,
      hintsUsed: hints,
      mistakes: 0,
      moves: 0,
    }, ac.signal).catch(err => {
      if (err?.name !== 'AbortError') console.error('[tangram] save move failed', err)
    })
  }

  async function completePuzzle(pieces: PieceState[], elapsed: number, hints: number) {
    if (!sessionIdRef.current || completionCalledRef.current) return
    completionCalledRef.current = true
    try {
      const pieceStates = piecesToRecord(pieces)
      await gameApi.completeSession('tangram', sessionIdRef.current, {
        pieceStates,
        elapsedSeconds: elapsed,
        hintsUsed: hints,
        mistakes: 0,
        moves: 0,
      })
      sessionIdRef.current = null
    } catch { /* ignore */ }
  }

  function failSession() {
    if (!sessionIdRef.current) return
    const id = sessionIdRef.current
    sessionIdRef.current = null
    gameApi.abandonSession('tangram', id).catch(() => {})
  }

  // Abandon exactly once per loss — moved out of the timer updater
  useEffect(() => {
    if (gameStatus === 'lost') failSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStatus])

  // Helper: Create standard polygon has been removed as standardPolygon is now initialized dynamically from target geometry.

  // Timer effect — only depends on gameStatus to avoid unnecessary restarts
  useEffect(() => {
    // Stop timer if not actively playing or already won
    if (gameStatus !== 'playing' || hasWonOnce) {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      return
    }

    // Clear any existing interval before starting a new one
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining(t => {
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
  }, [gameStatus, hasWonOnce])

  // Cleanup hint timeout on unmount
  useEffect(() => {
    return () => {
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current)
      }
    }
  }, [])

  // Async init — fetch puzzle from API, but prefer resuming a server session
  useEffect(() => {
    // StrictMode double-mount guard: skip first mount in dev
    if (process.env.NODE_ENV === 'development' && !_tangramMountGuard) {
      _tangramMountGuard = true
      return
    }

    let cancelled = false
      ; (async () => {
        setLoading(true)
        try {
          ensureGuestId()
          const challengeId = isDailyChallenge
            ? `daily-tangram-${dateParam || getTodayDateParam()}`
            : undefined

          let restored = false
          try {
            const contRes = isDailyChallenge
              ? await gameApi.getContinueDaily('tangram', challengeId as string).catch(() => null)
              : await gameApi.getContinue('tangram', difficulty).catch(() => null)
            if (
              !cancelled &&
              contRes?.hasActiveSession &&
              contRes.session?.sessionId &&
              contRes.session?.puzzle?.id &&
              (!isDailyChallenge || contRes.session?.puzzle?.pieceShapeIds?.length > 0)
            ) {
              const s = contRes.session
              const p: PolygonPuzzle = {
                id: s.puzzle.id,
                sourceId: s.puzzle.id,
                difficulty: s.puzzle.difficulty,
                pieceShapeIds: s.puzzle.pieceShapeIds || [],
                individualPiecePolygons: s.puzzle.individualPiecePolygons || [],
                fullPolygon: s.puzzle.fullPolygon || [],
                gameType: 'tangram',
                active: true,
              }
              sessionIdRef.current = s.sessionId
              sessionCreatedRef.current = true
              serverRestoreRef.current = {
                pieceStates: s.pieceStates || [],
                elapsedSeconds: s.elapsedTime || 0,
                hintsUsed: s.hintsUsed || 0,
              }
              writeCache(p)
              setPuzzle(p)
              restored = true
            }
          } catch { /* fall through to fresh puzzle */ }

          if (!restored && !cancelled) {
            let p: PolygonPuzzle | null = null
            try {
              if (isDailyChallenge) {
                const res = await gameApi.getDailyPuzzle('tangram', getDailyDateString(dateParam))
                if (!res || !(res as any).id) throw new Error('invalid_puzzle')
                p = res as unknown as PolygonPuzzle
              } else {
                const res = await gameApi.getPuzzle('tangram', { difficulty })
                if (!res || !(res as any).id) throw new Error('invalid_puzzle')
                p = res as unknown as PolygonPuzzle
              }
            } catch {
              p = null
            }
            if (!cancelled) {
              if (p && Array.isArray(p.fullPolygon) && Array.isArray(p.pieceShapeIds)) {
                writeCache(p)
                setPuzzle(p)
                initSession(p.id, difficulty, isDailyChallenge, challengeId)
              }
            }
          }
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
    return () => {
      cancelled = true
      if (process.env.NODE_ENV === 'development') _tangramMountGuard = false
    }
  }, [difficulty, isDailyChallenge, dateParam])

  // Update challenge status to in-progress when game is loaded
  useEffect(() => {
    if (puzzle && isDailyChallenge) {
      const challengeId = dateParam ? `daily-tangram-${dateParam}` : `daily-tangram-${getTodayDateParam()}`
      const currentStatus = getChallengeStatus(challengeId)
      if (currentStatus !== 'completed') {
        updateChallengeStatus(challengeId, 'in-progress')
      }
    }
  }, [puzzle, isDailyChallenge, dateParam])

  // Initialize pieces from puzzle
  useEffect(() => {
    if (!puzzle || !Array.isArray(puzzle.fullPolygon)) return

    const scaled = scaleAndCenterPolygon(puzzle.fullPolygon)
    scaledData.current = scaled

    // Tray layout - Two rows, defined by target centroids (cx, cy) - Better spacing for all piece sizes
    const TRAY_LAYOUT: Record<string, { cx: number; cy: number; rotation: number }> = {
      'baseTriangle1': { cx: 140, cy: 335, rotation: 45 },
      'mediumTriangle': { cx: 375, cy: 335, rotation: 45 },
      'baseTriangle2': { cx: 610, cy: 335, rotation: 45 },
      'smallTriangle1': { cx: 125, cy: 445, rotation: 45 },
      'smallTriangle2': { cx: 290, cy: 445, rotation: 45 },
      'square': { cx: 455, cy: 445, rotation: 0 },
      'parallelogram': { cx: 620, cy: 445, rotation: 0 }
    }

    const initialPieces: PieceState[] = puzzle.pieceShapeIds.map((id, index) => {
      // Get polygon from dataset for solution target
      const basePolygon = puzzle.individualPiecePolygons[index]
      const scaledTarget = basePolygon.map(([x, y]) => [
        x * scaled.scale + scaled.offsetX,
        y * scaled.scale + scaled.offsetY
      ])

      const pieceType = PIECE_TYPE_MAP[id]
      const trayLayoutItem = TRAY_LAYOUT[id] || { cx: 100, cy: 400, rotation: 0 }

      const targetRotation = getTargetRotation(pieceType, scaledTarget, scaled.scale)

      // Get standard piece shape by centering the solution target and rotating it
      const targetCx = scaledTarget.reduce((sum, p) => sum + p[0], 0) / scaledTarget.length
      const targetCy = scaledTarget.reduce((sum, p) => sum + p[1], 0) / scaledTarget.length
      const centered = scaledTarget.map(([x, y]) => [x - targetCx, y - targetCy])

      // Initial rotation
      const initRotation = trayLayoutItem.rotation - targetRotation
      const rad = (initRotation * Math.PI) / 180
      const cos = Math.cos(rad)
      const sin = Math.sin(rad)

      // Rotated and translated to tray position
      const standardPolygon = centered.map(([x, y]) => [
        trayLayoutItem.cx + (x * cos - y * sin),
        trayLayoutItem.cy + (x * sin + y * cos)
      ])

      const trayCentroidX = trayLayoutItem.cx
      const trayCentroidY = trayLayoutItem.cy

      return {
        id: id as TangramPieceId,
        basePolygon: scaledTarget,
        currentPolygon: standardPolygon,
        targetPolygon: scaledTarget,
        // Store centroid as the transform center
        transform: { x: trayCentroidX, y: trayCentroidY, rotation: trayLayoutItem.rotation - targetRotation },
        color: PIECE_COLORS[id as TangramPieceId] || '#999',
        isPlaced: false,
        isSnapped: false
      }
    })
    // If replaying or resetting, force fresh initialPieces layout in tray
    if (isReplayingRef.current) {
      isReplayingRef.current = false
      if (typeof window !== 'undefined') {
        try {
          Object.keys(localStorage).forEach(k => {
            if (k.startsWith('puzzroo_tangram_game_')) {
              localStorage.removeItem(k)
            }
          })
        } catch {}
      }
      setPieces(initialPieces)
      setMoveHistory([initialPieces])
      setHistoryIndex(0)
      lastCommittedStateRef.current = initialPieces
      return
    }

    // Restore from a server-backed session (continue flow) — server is the
    // authority for piece states and elapsed time.
    const serverRestore = serverRestoreRef.current
    if (serverRestore && serverRestore.pieceStates && serverRestore.pieceStates.length > 0) {
      serverRestoreRef.current = null
      const restoredPieces = initialPieces.map(p => {
        const savedPiece = serverRestore.pieceStates.find((s: any) => s.pieceId === p.id)
        if (savedPiece) {
          const { tx, ty } = stateToScreen(savedPiece, p)
          const rot = savedPiece.rotation ?? 0

          const targetCx = p.targetPolygon.reduce((sum, pt) => sum + pt[0], 0) / p.targetPolygon.length
          const targetCy = p.targetPolygon.reduce((sum, pt) => sum + pt[1], 0) / p.targetPolygon.length
          const centered = p.targetPolygon.map(([cx, cy]) => [cx - targetCx, cy - targetCy])

          const rad = (rot * Math.PI) / 180
          const cos = Math.cos(rad)
          const sin = Math.sin(rad)

          const currentPolygon = centered.map(([cx, cy]) => [
            tx + (cx * cos - cy * sin),
            ty + (cx * sin + cy * cos)
          ])

          return {
            ...p,
            transform: { x: tx, y: ty, rotation: rot },
            currentPolygon,
            isPlaced: savedPiece.placed || false,
            isSnapped: savedPiece.snapped || false,
          }
        }
        return p
      })

      setPieces(restoredPieces)
      setMoveHistory([restoredPieces])
      setHistoryIndex(0)
      lastCommittedStateRef.current = restoredPieces

      const remaining = Math.max(0, getInitialTime(difficulty) - (serverRestore.elapsedSeconds || 0))
      setTimeRemaining(remaining)
      setHintsUsed(serverRestore.hintsUsed || 0)
      return // Skip standard tray layout initialization
    }

    // Check if there is a saved state in LocalStorage first!
    if (typeof window !== 'undefined') {
      try {
        const userStr = getCurrentUser()
        const userId = userStr ? userStr.id : 'guest'
        const storageKey = `puzzroo_tangram_game_${userId}`
        const savedRaw = localStorage.getItem(storageKey)
        if (savedRaw) {
          const saved = JSON.parse(savedRaw)
          if (saved.puzzleId === puzzle.id && saved.difficulty === difficulty && saved.pieceStates && saved.pieceStates.length > 0) {
            const isFullySolved = saved.pieceStates.every((s: any) => s.placed || s.snapped)
            if (isFullySolved) {
              localStorage.removeItem(storageKey)
            } else {
              // Restore from LocalStorage!
            const restoredPieces = initialPieces.map(p => {
              const savedPiece = saved.pieceStates.find((s: any) => s.pieceId === p.id)
              if (savedPiece) {
                const { tx, ty } = stateToScreen(savedPiece, p)
                const rot = savedPiece.rotation ?? 0
                const targetCx = p.targetPolygon.reduce((sum, pt) => sum + pt[0], 0) / p.targetPolygon.length
                const targetCy = p.targetPolygon.reduce((sum, pt) => sum + pt[1], 0) / p.targetPolygon.length
                const centered = p.targetPolygon.map(([cx, cy]) => [cx - targetCx, cy - targetCy])
                
                const rad = (rot * Math.PI) / 180
                const cos = Math.cos(rad)
                const sin = Math.sin(rad)
                
                const currentPolygon = centered.map(([cx, cy]) => [
                  tx + (cx * cos - cy * sin),
                  ty + (cx * sin + cy * cos)
                ])
                
                return {
                  ...p,
                  transform: { x: tx, y: ty, rotation: rot },
                  currentPolygon,
                  isPlaced: savedPiece.placed || false,
                  isSnapped: savedPiece.snapped || false,
                }
              }
              return p
            })

            setPieces(restoredPieces)
            setMoveHistory([restoredPieces])
            setHistoryIndex(0)
            lastCommittedStateRef.current = restoredPieces

              const remaining = getInitialTime(difficulty) - saved.elapsedSeconds
              setTimeRemaining(Math.max(0, remaining))
              setHintsUsed(saved.hintsUsed)
              return // Skip standard tray layout initialization
            }
          }
        }
      } catch (e) {
        console.error('[tangram] local restore failed', e)
      }
    }

    setPieces(initialPieces)
    setMoveHistory([initialPieces])
    setHistoryIndex(0)
    lastCommittedStateRef.current = initialPieces
  }, [puzzle])

  const lastMoveKeyRef = useRef('')

  useEffect(() => {
    if (gameStatus !== 'playing') return
    if (pieces.length === 0 || !puzzle) return
    const elapsed = getInitialTime(difficulty) - timeRemaining
    const key = JSON.stringify(pieces.map(p => ({ id: p.id, x: p.transform.x, y: p.transform.y, r: p.transform.rotation, placed: p.isPlaced, snapped: p.isSnapped })))
    if (key === lastMoveKeyRef.current) return
    lastMoveKeyRef.current = key

    // Save to LocalStorage
    if (typeof window !== 'undefined') {
      try {
        const userStr = getCurrentUser()
        const userId = userStr ? userStr.id : 'guest'
        const storageKey = `puzzroo_tangram_game_${userId}`
        localStorage.setItem(storageKey, JSON.stringify({
          puzzleId: puzzle.id,
          difficulty,
          elapsedSeconds: elapsed,
          hintsUsed,
          pieceStates: piecesToRecord(pieces),
        }))
      } catch (e) {
        console.error('[tangram] local save failed', e)
      }
    }
  }, [pieces, hintsUsed, timeRemaining, gameStatus, difficulty, puzzle])

  // Flush the exact close-moment countdown to the server when the page is
  // closed or hidden (tab close, navigation, back button). Move saves alone
  // would leave the restored timer rewound to the last move.
  useEffect(() => {
    if (gameStatus !== 'playing' || pieces.length === 0) return

    const flushElapsed = () => {
      if (!sessionIdRef.current || completionCalledRef.current) return
      const elapsed = elapsedFromCountdown(timeRemainingRef.current, difficulty)
      const pieceStates = piecesToRecord(piecesRef.current)
      Promise.resolve(gameApi.saveMove('tangram', sessionIdRef.current, {
        pieceStates,
        elapsedSeconds: elapsed,
        hintsUsed: hintsUsedRef.current,
        mistakes: 0,
        moves: 0,
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
  }, [gameStatus, pieces.length])

  useEffect(() => {
    // Don't validate if pieces haven't been initialized yet or if the game is lost
    if (pieces.length === 0 || gameStatus === 'lost') return

    // Once the puzzle has been won, don't re-run win/loss detection
    // This allows undo/redo without re-triggering the modal
    if (hasWonOnce) return

    // Only validate if at least one piece is placed when in playing mode
    if (gameStatus === 'playing') {
      const hasPlacedPieces = pieces.some(p => p.isPlaced)
      if (!hasPlacedPieces) return
    }

    const currentPolygons = pieces.map(p => p.currentPolygon)
    const targetPolygons = pieces.map(p => p.targetPolygon)
    const pieceIds = pieces.map(p => p.id)

    const validation = validatePuzzle(pieceIds, currentPolygons, targetPolygons)

    if (validation.isSolved) {
      if (gameStatus === 'playing') {
        // 0.3-second delay so the last piece snaps before the modal shows
        const timer = setTimeout(() => {
          setGameStatus('won')
          setHasWonOnce(true)
          const finalScore = Math.max(0, 1000 + timeRemaining * 5 - hintsUsed * 100)
          setScore(finalScore)

          // Mark puzzle as completed in universal completion system
          const dateParam = searchParams?.get('date')
          const puzzleId = dateParam ? `daily-tangram-${dateParam}` : puzzle?.id
          if (puzzleId) {
            // Clear local storage progress upon completion
            if (typeof window !== 'undefined') {
              try {
                const userStr = getCurrentUser()
                const userId = userStr ? userStr.id : 'guest'
                localStorage.removeItem(`puzzroo_tangram_game_${userId}`)
              } catch {}
            }

            markPuzzleCompleted('tangram', puzzleId, {
              time: getInitialTime(difficulty) - timeRemaining,
              score: finalScore,
              difficulty: difficulty,
            })
            if (isDailyChallenge) {
              updateChallengeStatus(puzzleId, 'completed')
            }
            completePuzzle(pieces, getInitialTime(difficulty) - timeRemaining, hintsUsed)
          }
        }, 300)
        return () => clearTimeout(timer)
      }
    }
  }, [pieces, gameStatus, hasWonOnce, timeRemaining, hintsUsed, searchParams, puzzle, difficulty])


  const selectPiece = useCallback((pieceId: TangramPieceId | null) => {
    setSelectedPiece(pieceId)
  }, [])

  const movePiece = useCallback((pieceId: TangramPieceId, centerX: number, centerY: number, onSnapSuccess?: () => void) => {
    setPieces(prev => {
      const newPieces = prev.map(piece => {
        if (piece.id !== pieceId) return piece

        // Calculate delta from current center to new center
        const deltaX = centerX - piece.transform.x
        const deltaY = centerY - piece.transform.y

        // Apply delta to all polygon points
        const newPolygon = piece.currentPolygon.map(([px, py]) => [px + deltaX, py + deltaY])
        const newTransform = { x: centerX, y: centerY, rotation: piece.transform.rotation }

        // Try snapping
        const targetPolygons = prev.map(p => p.targetPolygon)

        // Calculate which target slots are already occupied by other snapped pieces
        const occupiedTargetIndices = new Set<number>()
        prev.forEach(p => {
          if (p.id !== pieceId && p.isSnapped) {
            const matchedIndex = targetPolygons.findIndex(targetPoly =>
              geometricallyMatches(p.currentPolygon, targetPoly, 5)
            )
            if (matchedIndex !== -1) {
              occupiedTargetIndices.add(matchedIndex)
            }
          }
        })

        const snapResult = attemptSnap(
          pieceId,
          newPolygon,
          newTransform,
          targetPolygons,
          puzzle!.pieceShapeIds,
          scaledData.current?.scale || 1,
          occupiedTargetIndices
        )

        if (snapResult?.shouldSnap) {
          // Trigger pulse animation only if it wasn't already snapped (prevents pulse on simple click)
          if (onSnapSuccess && !piece.isSnapped) {
            setTimeout(() => onSnapSuccess(), 0)
          }
          // Deselect piece on successful snap
          if (!piece.isSnapped) {
            setTimeout(() => {
              setSelectedPiece(null)
            }, 0)
          }

          // Snap: use target polygon and target center
          return {
            ...piece,
            transform: snapResult.snapTransform,
            currentPolygon: snapResult.targetPolygon,
            isPlaced: true,
            isSnapped: true
          }
        }

        // No snap: use new position
        return {
          ...piece,
          transform: newTransform,
          currentPolygon: newPolygon,
          isPlaced: true,
          isSnapped: false
        }
      })

      return newPieces
    })
  }, [puzzle])

  const rotatePiece = useCallback((pieceId: TangramPieceId, direction: 1 | -1) => {
    setPieces(prev => {
      const newPieces = prev.map(piece => {
        if (piece.id !== pieceId) return piece

        const newRotation = piece.transform.rotation + direction * 45

        // Keep transform.x and transform.y STABLE - they define the rotation center
        // Do NOT recalculate from currentPolygon

        // Rotate currentPolygon coordinates around the STABLE center
        const centerX = piece.transform.x
        const centerY = piece.transform.y

        const radians = (direction * 45 * Math.PI) / 180
        const cos = Math.cos(radians)
        const sin = Math.sin(radians)

        const rotatedPolygon = piece.currentPolygon.map(([x, y]) => {
          const dx = x - centerX
          const dy = y - centerY
          return [
            centerX + dx * cos - dy * sin,
            centerY + dx * sin + dy * cos
          ]
        })

        // Return with UNCHANGED center coordinates
        return {
          ...piece,
          transform: { x: centerX, y: centerY, rotation: newRotation },
          currentPolygon: rotatedPolygon,
          isSnapped: false
        }
      })

      // Save new state to history if it actually changed
      if (lastCommittedStateRef.current && areStatesEqual(newPieces, lastCommittedStateRef.current)) {
        return newPieces
      }
      lastCommittedStateRef.current = newPieces

      setHistoryIndex(idx => {
        setMoveHistory(history => [...history.slice(0, idx + 1), newPieces])
        return idx + 1
      })

      return newPieces
    })
  }, [])

  const rotateLeft = useCallback(() => {
    if (selectedPiece) rotatePiece(selectedPiece, -1)
  }, [selectedPiece, rotatePiece])

  const rotateRight = useCallback(() => {
    if (selectedPiece) rotatePiece(selectedPiece, 1)
  }, [selectedPiece, rotatePiece])

  const requestHint = useCallback(() => {
    if (hintsUsed >= 3) return

    // Clear any existing hint timeout to prevent overlapping timeouts from hiding the hint early
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current)
      hintTimeoutRef.current = null
    }

    const currentPolygons = pieces.map(p => p.currentPolygon)
    const targetPolygons = pieces.map(p => p.targetPolygon)
    const pieceIds = pieces.map(p => p.id)
    const validation = validatePuzzle(pieceIds, currentPolygons, targetPolygons)

    // Get all pieces that are not correctly placed/snapped
    const unsolvedPieces = pieces.filter(p => {
      const val = validation.pieces.find(vp => vp.pieceId === p.id)
      return val ? !val.isCorrect : true
    })

    if (unsolvedPieces.length === 0) return // No pieces to hint

    // Get unsolved pieces that haven't been shown yet
    const unhintedPieces = unsolvedPieces.filter(p => !shownHints.current.has(p.id))

    let chosenPieceId: TangramPieceId

    // If all unsolved pieces have been hinted, clear the set and start over
    if (unhintedPieces.length === 0) {
      shownHints.current.clear()
      // Now all unsolved pieces are available for hints again
      const randomPiece = unsolvedPieces[Math.floor(Math.random() * unsolvedPieces.length)]
      chosenPieceId = randomPiece.id
    } else {
      // Show hint for a random unhinted piece
      const randomPiece = unhintedPieces[Math.floor(Math.random() * unhintedPieces.length)]
      chosenPieceId = randomPiece.id
    }

    shownHints.current.add(chosenPieceId)
    const newHintsUsed = hintsUsed + 1
    setHintsUsed(newHintsUsed)
    setHintPiece(chosenPieceId)

    // Easy: 3s, Medium: 2s, Hard: 1s
    const hintDuration = difficulty === 'hard' ? 1000 : difficulty === 'medium' ? 2000 : 3000

    hintTimeoutRef.current = setTimeout(() => {
      setHintPiece(null)
      hintTimeoutRef.current = null
    }, hintDuration)
  }, [hintsUsed, pieces, difficulty])

  const autoFill = useCallback(() => {
    setPieces(prev => {
      const newPieces = prev.map((piece, index) => {
        const targetPolygon = prev[index].targetPolygon
        const targetCentroid = calculateCentroid(polygonToPoints(targetPolygon))

        return {
          ...piece,
          transform: { x: targetCentroid.x, y: targetCentroid.y, rotation: 0 },
          currentPolygon: targetPolygon,
          isPlaced: true,
          isSnapped: true
        }
      })

      setHistoryIndex(idx => {
        setMoveHistory(history => [...history.slice(0, idx + 1), newPieces])
        return idx + 1
      })

      return newPieces
    })
  }, [])

  const resetGame = useCallback(() => {
    isReplayingRef.current = true
    if (sessionIdRef.current) {
      gameApi.abandonSession('tangram', sessionIdRef.current).catch(() => {})
    }
    if (typeof window !== 'undefined') {
      try {
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('puzzroo_tangram_game_')) {
            localStorage.removeItem(k)
          }
        })
      } catch {}
    }
    // Clear pieces first to prevent validation from running
    setPieces([])
    setSelectedPiece(null)
    setGameStatus('playing')
    setHasWonOnce(false)
    setTimeRemaining(getInitialTime(difficulty))
    setScore(0)
    setHintsUsed(0)
    setHintPiece(null)
    shownHints.current.clear()
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current)
      hintTimeoutRef.current = null
    }
    // Set new puzzle - this will trigger piece initialization
    let cancelled = false
      ; (async () => {
        setLoading(true)
        try {
          let p: PolygonPuzzle
        const res = await gameApi.getPuzzle('tangram', { difficulty })
        if (!res || !(res as any).id) throw new Error('invalid_puzzle')
        p = res as unknown as PolygonPuzzle
          if (!cancelled) {
            writeCache(p)
            setPuzzle(p)
            sessionCreatedRef.current = false
            sessionIdRef.current = null
            initSession(p.id, difficulty, isDailyChallenge, isDailyChallenge ? `daily-tangram-${dateParam || getTodayDateParam()}` : undefined)
          }
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
    return () => { cancelled = true }
  }, [difficulty])

  const newGame = useCallback(() => {
    isReplayingRef.current = true
    if (sessionIdRef.current) {
      gameApi.abandonSession('tangram', sessionIdRef.current).catch(() => {})
    }
    if (typeof window !== 'undefined') {
      try {
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('puzzroo_tangram_game_')) {
            localStorage.removeItem(k)
          }
        })
      } catch {}
    }
    // Clear pieces first to prevent validation from running
    setPieces([])
    setSelectedPiece(null)
    setGameStatus('playing')
    setHasWonOnce(false)
    setTimeRemaining(getInitialTime(difficulty))
    setScore(0)
    setHintsUsed(0)
    setHintPiece(null)
    shownHints.current.clear()
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current)
      hintTimeoutRef.current = null
    }
    // Get a different puzzle - this will trigger piece initialization
    const currentSourceId = puzzle?.sourceId
    let cancelled = false
      ; (async () => {
        setLoading(true)
        try {
          let p: PolygonPuzzle
        const res = await gameApi.getPuzzle('tangram', { difficulty, exclude: currentSourceId })
        if (!res || !(res as any).id) throw new Error('invalid_puzzle')
        p = res as unknown as PolygonPuzzle
          if (!cancelled) {
            writeCache(p)
            setPuzzle(p)
            sessionCreatedRef.current = false
            sessionIdRef.current = null
            initSession(p.id, difficulty, isDailyChallenge, isDailyChallenge ? `daily-tangram-${dateParam || getTodayDateParam()}` : undefined)
          }
        } finally {
          if (!cancelled) setLoading(false)
        }
      })()
    return () => { cancelled = true }
  }, [difficulty, puzzle, isDailyChallenge, dateParam])

  const replayPuzzle = useCallback(() => {
    isReplayingRef.current = true
    if (typeof window !== 'undefined') {
      try {
        Object.keys(localStorage).forEach(k => {
          if (k.startsWith('puzzroo_tangram_game_')) {
            localStorage.removeItem(k)
          }
        })
      } catch {}
    }
    setPieces([])
    setSelectedPiece(null)
    setGameStatus('playing')
    setHasWonOnce(false)
    setTimeRemaining(getInitialTime(difficulty))
    setScore(0)
    setHintsUsed(0)
    setHintPiece(null)
    shownHints.current.clear()
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current)
      hintTimeoutRef.current = null
    }

    completionCalledRef.current = false
    sessionCreatedRef.current = false
    setHistoryIndex(0)

    const current = puzzle
    if (current) {
      setPuzzle({ ...current, _t: Date.now() } as any)
      const existingSessionId = sessionIdRef.current
      const challengeId = isDailyChallenge
        ? `daily-tangram-${dateParam || getTodayDateParam()}`
        : undefined
      void (async () => {
        try {
          if (!isDailyChallenge && existingSessionId) {
            const res = await gameApi.replayTangramSession(existingSessionId, current.id)
            if (res && (res.sessionId || res._id || res.id)) {
              sessionIdRef.current = res.sessionId || res._id || res.id
              sessionCreatedRef.current = true
              return
            }
          }
        } catch { /* fall back to a fresh session */ }
        sessionIdRef.current = null
        initSession(current.id, difficulty, isDailyChallenge, challengeId)
      })()
    }
  }, [difficulty, puzzle, isDailyChallenge, dateParam])

  const undoMove = useCallback(() => {
    const currentIdx = historyIndexRef.current
    const history = moveHistoryRef.current
    if (currentIdx > 0) {
      const newIdx = currentIdx - 1
      const targetState = history[newIdx]
      if (targetState) {
        setPieces(targetState)
        lastCommittedStateRef.current = targetState
        setHistoryIndex(newIdx)
      }
    }
  }, [])

  const redoMove = useCallback(() => {
    const currentIdx = historyIndexRef.current
    const history = moveHistoryRef.current
    if (currentIdx < history.length - 1) {
      const newIdx = currentIdx + 1
      const targetState = history[newIdx]
      if (targetState) {
        setPieces(targetState)
        lastCommittedStateRef.current = targetState
        setHistoryIndex(newIdx)
      }
    }
  }, [])

  const clearHistory = useCallback(() => {
    setMoveHistory([])
    setHistoryIndex(-1)
  }, [])

  const commitHistory = useCallback(() => {
    setPieces(prev => {
      if (lastCommittedStateRef.current && areStatesEqual(prev, lastCommittedStateRef.current)) {
        return prev
      }
      lastCommittedStateRef.current = prev

      setHistoryIndex(idx => {
        setMoveHistory(history => [...history.slice(0, idx + 1), prev])
        return idx + 1
      })

      const hasPlacedOrSnapped = prev.some(p => p.isPlaced || p.isSnapped)
      if (hasPlacedOrSnapped) {
        const elapsed = elapsedFromCountdown(timeRemainingRef.current, difficulty)
        saveMoveNow(prev, elapsed, hintsUsedRef.current)
      }

      return prev
    })
  }, [difficulty])

  const undoLastMove = useCallback(() => {
    // Find the most recently placed piece and return it to tray
    setPieces(prev => {
      const placedPieces = prev.filter(p => p.isPlaced)
      if (placedPieces.length === 0) return prev

      // Get last placed piece (assumes most recent is last in placed array)
      const lastPlaced = placedPieces[placedPieces.length - 1]

      // Return this piece to its tray position by re-initializing it
      return prev.map(piece => {
        if (piece.id !== lastPlaced.id) return piece

        // Re-create tray position for this piece - MUST match initialization layout
        const TRAY_LAYOUT: Record<string, { cx: number; cy: number; rotation: number }> = {
          'baseTriangle1': { cx: 140, cy: 335, rotation: 45 },
          'mediumTriangle': { cx: 375, cy: 335, rotation: 45 },
          'baseTriangle2': { cx: 610, cy: 335, rotation: 45 },
          'smallTriangle1': { cx: 125, cy: 445, rotation: 45 },
          'smallTriangle2': { cx: 290, cy: 445, rotation: 45 },
          'square': { cx: 455, cy: 445, rotation: 0 },
          'parallelogram': { cx: 620, cy: 445, rotation: 0 }
        }

        const trayLayoutItem = TRAY_LAYOUT[piece.id] || { cx: 100, cy: 400, rotation: 0 }
        const pieceType = PIECE_TYPE_MAP[piece.id]
        const scale = scaledData.current?.scale || 1

        const targetRotation = getTargetRotation(pieceType, piece.targetPolygon, scale)

        // Get standard piece shape by centering the solution target and rotating it
        const targetCx = piece.targetPolygon.reduce((sum: number, p: number[]) => sum + p[0], 0) / piece.targetPolygon.length
        const targetCy = piece.targetPolygon.reduce((sum: number, p: number[]) => sum + p[1], 0) / piece.targetPolygon.length
        const centered = piece.targetPolygon.map(([x, y]) => [x - targetCx, y - targetCy])

        // Initial rotation
        const initRotation = trayLayoutItem.rotation - targetRotation
        const rad = (initRotation * Math.PI) / 180
        const cos = Math.cos(rad)
        const sin = Math.sin(rad)

        // Rotated and translated to tray position
        const standardPolygon = centered.map(([x, y]) => [
          trayLayoutItem.cx + (x * cos - y * sin),
          trayLayoutItem.cy + (x * sin + y * cos)
        ])

        const trayCentroidX = trayLayoutItem.cx
        const trayCentroidY = trayLayoutItem.cy

        return {
          ...piece,
          transform: { x: trayCentroidX, y: trayCentroidY, rotation: trayLayoutItem.rotation - targetRotation },
          currentPolygon: standardPolygon,
          isPlaced: false,
          isSnapped: false
        }
      })
    })
  }, [])

  return {
    puzzle,
    loading,
    pieces,
    selectedPiece,
    gameStatus,
    timeRemaining,
    score,
    hintsUsed,
    hintPiece,
    availableHints: 3 - hintsUsed,
    isSolved: gameStatus === 'won',
    scaledData: scaledData.current,
    selectPiece,
    movePiece,
    rotateLeft,
    rotateRight,
    requestHint,
    autoFill,
    resetGame,
    newGame,
    replayPuzzle,
    undoLastMove,
    undoMove,
    redoMove,
    hasUndo: historyIndex > 0,
    hasRedo: historyIndex < moveHistory.length - 1,
    commitHistory
  }
}
