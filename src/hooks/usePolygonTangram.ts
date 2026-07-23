/**
 * Polygon-Based Tangram Hook
 * Uses standard Tangram piece shapes in tray, polygon datasets for solution
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { markPuzzleCompleted } from '@shared/lib/completion/universal'
import { PolygonPuzzle, TangramPieceId } from '@shared/types/tangram-polygon'
import { getRandomPuzzle, getPuzzlesByDifficulty } from '@shared/data/tangram'
import type { TangramDifficulty } from '@shared/data/tangram'
import { updateChallengeStatus, getChallengeStatus } from '@shared/lib/dailyChallenge/storage'

function getTodayDateParam(): string {
  const d = new Date()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const y = String(d.getFullYear()).slice(-2)
  return `${m}-${day}-${y}`
}

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

function getDailyTangramPuzzle(date: Date, diff: TangramDifficulty): PolygonPuzzle {
  const seed = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate()
  const pool = getPuzzlesByDifficulty(diff)
  const x = Math.sin(seed) * 10000
  const rand = x - Math.floor(x)
  const index = Math.floor(rand * pool.length)
  return pool[index]
}
import { gameApi } from '@/lib/api/gameApi'
import { scaleAndCenterPolygon, polygonToSVGPath } from '@shared/lib/tangram/polygon-renderer'
import { calculateCentroid, polygonToPoints } from '@shared/lib/tangram/polygon-geometry'
import { validatePuzzle } from '@shared/lib/tangram/polygon-validation'
import { attemptSnap, geometricallyMatches } from '@shared/lib/tangram/polygon-snapping'
import { PIECE_CONFIG, UNIT } from '@shared/lib/tangram/pieceConfig'

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

  const [puzzle, setPuzzle] = useState<PolygonPuzzle>(() => {
    if (isDailyChallenge) {
      return getDailyTangramPuzzle(getDailyDate(dateParam), difficulty)
    }
    return getRandomPuzzle(difficulty)
  })
  const getInitialTime = (diff: TangramDifficulty) => {
    switch (diff) {
      case 'hard': return 90    // 1.5 minutes
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
  const puzzleRef = useRef<PolygonPuzzle>(puzzle)

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

  // Async init — fetch puzzle from API with static fallback + localStorage cache
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        let p: PolygonPuzzle
        try {
          if (isDailyChallenge) {
            p = (await gameApi.getDailyPuzzle('tangram', getDailyDateString(dateParam))) as unknown as PolygonPuzzle
          } else {
            const res = await gameApi.getPuzzle('tangram', { difficulty })
            if (!res || !(res as any).id) throw new Error('invalid_puzzle')
            p = res as unknown as PolygonPuzzle
          }
        } catch {
          p = isDailyChallenge
            ? getDailyTangramPuzzle(getDailyDate(dateParam), difficulty)
            : getRandomPuzzle(difficulty)
        }
        if (!cancelled) {
          if (!p || !Array.isArray(p.fullPolygon) || !Array.isArray(p.pieceShapeIds)) {
            p = isDailyChallenge
              ? getDailyTangramPuzzle(getDailyDate(dateParam), difficulty)
              : getRandomPuzzle(difficulty)
          }
          writeCache(p)
          setPuzzle(p)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
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
    setPieces(initialPieces)
    setMoveHistory([initialPieces])
    setHistoryIndex(0)
    lastCommittedStateRef.current = initialPieces
  }, [puzzle])

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
            markPuzzleCompleted('tangram', puzzleId, {
              time: getInitialTime(difficulty) - timeRemaining,
              score: finalScore,
              difficulty: difficulty,
            })
            if (isDailyChallenge) {
              updateChallengeStatus(puzzleId, 'completed')
            }
            if (typeof window !== 'undefined' && localStorage.getItem('accessToken')) {
              gameApi.complete('tangram', {
                puzzleId,
                difficulty,
                score: finalScore,
                time: getInitialTime(difficulty) - timeRemaining,
                hintsUsed,
                mistakes: 0,
                moves: 0,
              }).catch(() => {})
            }
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
          puzzle.pieceShapeIds,
          scaledData.current?.scale || 1,
          occupiedTargetIndices
        )
        
        if (snapResult?.shouldSnap) {
          // Trigger pulse animation on successful snap
          if (onSnapSuccess) {
            setTimeout(() => onSnapSuccess(), 0)
          }
          // Deselect piece on successful snap
          setTimeout(() => {
            setSelectedPiece(null)
          }, 0)
          
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
    setHintsUsed(h => h + 1)
    setHintPiece(chosenPieceId)
    
    // Hard mode: 1 second hint. Easy/Medium: 5 seconds
    const hintDuration = difficulty === 'hard' ? 1000 : 5000
    
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
    ;(async () => {
      setLoading(true)
      try {
        let p: PolygonPuzzle
        try {
          const res = await gameApi.getPuzzle('tangram', { difficulty })
          if (!res || !(res as any).id) throw new Error('invalid_puzzle')
          p = res as unknown as PolygonPuzzle
        } catch {
          p = getRandomPuzzle(difficulty)
        }
        if (!cancelled) {
          writeCache(p)
          setPuzzle(p)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [difficulty])

  const newGame = useCallback(() => {
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
    ;(async () => {
      setLoading(true)
      try {
        let p: PolygonPuzzle
        try {
          const res = await gameApi.getPuzzle('tangram', { difficulty, exclude: currentSourceId })
          if (!res || !(res as any).id) throw new Error('invalid_puzzle')
          p = res as unknown as PolygonPuzzle
        } catch {
          p = getRandomPuzzle(difficulty, currentSourceId)
        }
        if (!cancelled) {
          writeCache(p)
          setPuzzle(p)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [difficulty, puzzle])

  const replayPuzzle = useCallback(() => {
    setSelectedPiece(null)
    setGameStatus('playing')
    setHasWonOnce(false)
    setTimeRemaining(getInitialTime(difficulty))
    setScore(0)
    setHintPiece(null)
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current)
      hintTimeoutRef.current = null
    }
    
    setHistoryIndex(0)
    
    // Re-fetch the same puzzle by id and reset it to the tray (cache-first)
    const current = puzzle
    const id = current?.id
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        let p: PolygonPuzzle
        if (isDailyChallenge) {
          try {
            const res = await gameApi.getDailyPuzzle('tangram', dateParam || undefined)
            if (!res || !(res as any).id) throw new Error('invalid_puzzle')
            p = res as unknown as PolygonPuzzle
          } catch {
            p = getDailyTangramPuzzle(getDailyDate(dateParam), difficulty)
          }
        } else if (id) {
          const cached = readCache(id)
          if (cached) {
            p = cached
          } else {
            try {
              const res = await gameApi.getPuzzleById('tangram', id)
              if (!res || !(res as any).id) throw new Error('invalid_puzzle')
              p = res as unknown as PolygonPuzzle
            } catch {
              p = current || getRandomPuzzle(difficulty)
            }
          }
        } else {
          p = current || getRandomPuzzle(difficulty)
        }
        if (!cancelled) {
          if (!p || !Array.isArray(p.fullPolygon) || !Array.isArray(p.pieceShapeIds)) {
            p = isDailyChallenge
              ? getDailyTangramPuzzle(getDailyDate(dateParam), difficulty)
              : current || getRandomPuzzle(difficulty)
          }
          writeCache(p)
          setPuzzle(p)
        }
      } catch {
        if (!cancelled) {
          const p = isDailyChallenge
            ? getDailyTangramPuzzle(getDailyDate(dateParam), difficulty)
            : current || getRandomPuzzle(difficulty)
          setPuzzle(p)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [difficulty, isDailyChallenge, dateParam])

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
      return prev
    })
  }, [])

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
