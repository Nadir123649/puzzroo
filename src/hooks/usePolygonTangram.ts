/**
 * Polygon-Based Tangram Hook
 * Uses standard Tangram piece shapes in tray, polygon datasets for solution
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { PolygonPuzzle, TangramPieceId } from '@/types/tangram-polygon'
import { getRandomPuzzle } from '@/data/tangram'
import type { TangramDifficulty } from '@/data/tangram'
import { scaleAndCenterPolygon, polygonToSVGPath } from '@/lib/tangram/polygon-renderer'
import { calculateCentroid, polygonToPoints } from '@/lib/tangram/polygon-geometry'
import { validatePuzzle } from '@/lib/tangram/polygon-validation'
import { attemptSnap, geometricallyMatches } from '@/lib/tangram/polygon-snapping'
import { PIECE_CONFIG, UNIT } from '@/lib/tangram/pieceConfig'

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
  
  // Calculate average of base polygon
  const baseAvgX = base.reduce((sum, p) => sum + p[0], 0) / base.length
  const baseAvgY = base.reduce((sum, p) => sum + p[1], 0) / base.length
  
  // Test 8 possible rotations (0, 45, 90, 135, 180, 225, 270, 315)
  for (let r = 0; r < 360; r += 45) {
    const radians = (r * Math.PI) / 180
    const cos = Math.cos(radians)
    const sin = Math.sin(radians)
    
    const rotated = base.map(([x, y]) => {
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
  
  return 0
}

export function usePolygonTangram(difficulty: TangramDifficulty = 'easy') {
  const [puzzle, setPuzzle] = useState<PolygonPuzzle>(() => getRandomPuzzle(difficulty))
  const [pieces, setPieces] = useState<PieceState[]>([])
  const [selectedPiece, setSelectedPiece] = useState<TangramPieceId | null>(null)
  const [gameStatus, setGameStatus] = useState<'playing' | 'won' | 'lost'>('playing')
  const [timeRemaining, setTimeRemaining] = useState(300) // 5 minutes for Easy mode
  const [score, setScore] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [hintPiece, setHintPiece] = useState<TangramPieceId | null>(null)
  
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const hintTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const shownHints = useRef<Set<TangramPieceId>>(new Set())
  const scaledData = useRef<ReturnType<typeof scaleAndCenterPolygon> | null>(null)

  // Helper: Create standard polygon for tray from pieceConfig with dynamic puzzle scale
  const createStandardPolygon = useCallback((
    pieceType: keyof typeof PIECE_CONFIG, 
    trayPos: { x: number; y: number; rotation: number },
    scale: number
  ): number[][] => {
    const config = PIECE_CONFIG[pieceType]
    const puzzleUnit = 5 * scale // 5 is the canonical unit in the dataset, scaled dynamically
    
    // Simple polygon approximation based on piece type scaled to match silhouette
    const basePolygons: Record<string, number[][]> = {
      'large-triangle-1': [[0, 0], [puzzleUnit * 2, 0], [0, puzzleUnit * 2], [0, 0]],
      'large-triangle-2': [[0, 0], [puzzleUnit * 2, 0], [0, puzzleUnit * 2], [0, 0]],
      'medium-triangle': [[0, 0], [puzzleUnit * Math.SQRT2, 0], [0, puzzleUnit * Math.SQRT2], [0, 0]],
      'small-triangle-1': [[0, 0], [puzzleUnit, 0], [0, puzzleUnit], [0, 0]],
      'small-triangle-2': [[0, 0], [puzzleUnit, 0], [0, puzzleUnit], [0, 0]],
      'square': [[0, 0], [puzzleUnit, 0], [puzzleUnit, puzzleUnit], [0, puzzleUnit], [0, 0]],
      'parallelogram': [[0, puzzleUnit], [puzzleUnit, 0], [puzzleUnit * 2, 0], [puzzleUnit, puzzleUnit], [0, puzzleUnit]]
    }
    
    const base = basePolygons[pieceType] || [[0, 0], [50, 0], [50, 50], [0, 50], [0, 0]]
    
    // Apply rotation if needed
    const radians = (trayPos.rotation * Math.PI) / 180
    const cos = Math.cos(radians)
    const sin = Math.sin(radians)
    
    const rotated = base.map(([x, y]) => [
      x * cos - y * sin,
      x * sin + y * cos
    ])
    
    // Translate to tray position
    return rotated.map(([x, y]) => [x + trayPos.x, y + trayPos.y])
  }, [])

  // Timer effect
  useEffect(() => {
    if (gameStatus !== 'playing') {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      return
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
  }, [gameStatus])

  // Cleanup hint timeout on unmount
  useEffect(() => {
    return () => {
      if (hintTimeoutRef.current) {
        clearTimeout(hintTimeoutRef.current)
      }
    }
  }, [])

  // Initialize pieces from puzzle
  useEffect(() => {
    if (!puzzle) return
    
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
      
      // Get STANDARD piece shape from pieceConfig
      const pieceType = PIECE_TYPE_MAP[id]
      const trayLayoutItem = TRAY_LAYOUT[id] || { cx: 100, cy: 400, rotation: 0 }
      
      const targetRotation = getTargetRotation(pieceType, scaledTarget, scaled.scale)
      
      // Calculate the rotated base average relative to (0,0) to compute tray translation offsets
      const puzzleUnit = 5 * scaled.scale
      const basePolygons: Record<string, number[][]> = {
        'large-triangle-1': [[0, 0], [puzzleUnit * 2, 0], [0, puzzleUnit * 2], [0, 0]],
        'large-triangle-2': [[0, 0], [puzzleUnit * 2, 0], [0, puzzleUnit * 2], [0, 0]],
        'medium-triangle': [[0, 0], [puzzleUnit * Math.SQRT2, 0], [0, puzzleUnit * Math.SQRT2], [0, 0]],
        'small-triangle-1': [[0, 0], [puzzleUnit, 0], [0, puzzleUnit], [0, 0]],
        'small-triangle-2': [[0, 0], [puzzleUnit, 0], [0, puzzleUnit], [0, 0]],
        'square': [[0, 0], [puzzleUnit, 0], [puzzleUnit, puzzleUnit], [0, puzzleUnit], [0, 0]],
        'parallelogram': [[0, puzzleUnit], [puzzleUnit, 0], [puzzleUnit * 2, 0], [puzzleUnit, puzzleUnit], [0, puzzleUnit]]
      }
      
      const base = basePolygons[pieceType] || [[0, 0], [50, 0], [50, 50], [0, 50], [0, 0]]
      const radians = (trayLayoutItem.rotation * Math.PI) / 180
      const cos = Math.cos(radians)
      const sin = Math.sin(radians)
      const rotated = base.map(([x, y]) => [
        x * cos - y * sin,
        x * sin + y * cos
      ])
      const rotatedAvgX = rotated.reduce((sum, p) => sum + p[0], 0) / rotated.length
      const rotatedAvgY = rotated.reduce((sum, p) => sum + p[1], 0) / rotated.length
      
      const trayPos = {
        x: trayLayoutItem.cx - rotatedAvgX,
        y: trayLayoutItem.cy - rotatedAvgY,
        rotation: trayLayoutItem.rotation
      }
      
      // Use standard piece polygon (scaled to match piece size)
      const standardPolygon = createStandardPolygon(pieceType, trayPos, scaled.scale)
      
      // CRITICAL: Calculate centroid of the rotated tray polygon
      // This is the CENTER that PolygonPiece expects in transform.x/y
      const trayCentroidX = standardPolygon.reduce((sum, p) => sum + p[0], 0) / standardPolygon.length
      const trayCentroidY = standardPolygon.reduce((sum, p) => sum + p[1], 0) / standardPolygon.length
      
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
  }, [puzzle, createStandardPolygon])

  useEffect(() => {
    if (gameStatus !== 'playing') return
    
    // Don't validate if pieces haven't been initialized yet
    if (pieces.length === 0) return
    
    // Only validate if at least one piece is placed
    const hasPlacedPieces = pieces.some(p => p.isPlaced)
    if (!hasPlacedPieces) return
    
    const currentPolygons = pieces.map(p => p.currentPolygon)
    const targetPolygons = pieces.map(p => p.targetPolygon)
    const pieceIds = pieces.map(p => p.id)
    
    const validation = validatePuzzle(pieceIds, currentPolygons, targetPolygons)
    
    if (validation.isSolved && gameStatus === 'playing') {
      // Only set 'won' if currently 'playing' to prevent multiple triggers
      setGameStatus('won')
      const finalScore = Math.max(0, 1000 + timeRemaining * 5 - hintsUsed * 100)
      setScore(finalScore)
    }
  }, [pieces, gameStatus, timeRemaining, hintsUsed])

  const selectPiece = useCallback((pieceId: TangramPieceId) => {
    setSelectedPiece(pieceId)
  }, [])

  const movePiece = useCallback((pieceId: TangramPieceId, centerX: number, centerY: number, onSnapSuccess?: () => void) => {
    setPieces(prev => prev.map(piece => {
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
    }))
  }, [puzzle])

  const rotatePiece = useCallback((pieceId: TangramPieceId, direction: 1 | -1) => {
    setPieces(prev => prev.map(piece => {
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
    }))
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
    
    hintTimeoutRef.current = setTimeout(() => {
      setHintPiece(null)
      hintTimeoutRef.current = null
    }, 5000)
  }, [hintsUsed, pieces])

  const autoFill = useCallback(() => {
    setPieces(prev => prev.map((piece, index) => {
      const targetPolygon = prev[index].targetPolygon
      const targetCentroid = calculateCentroid(polygonToPoints(targetPolygon))
      
      return {
        ...piece,
        transform: { x: targetCentroid.x, y: targetCentroid.y, rotation: 0 },
        currentPolygon: targetPolygon,
        isPlaced: true,
        isSnapped: true
      }
    }))
  }, [])

  const resetGame = useCallback(() => {
    // Clear pieces first to prevent validation from running
    setPieces([])
    setSelectedPiece(null)
    setGameStatus('playing')
    setTimeRemaining(300) // Reset to 5 minutes
    setScore(0)
    setHintsUsed(0)
    setHintPiece(null)
    shownHints.current.clear()
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current)
      hintTimeoutRef.current = null
    }
    // Set new puzzle - this will trigger piece initialization
    setPuzzle(getRandomPuzzle(difficulty))
  }, [difficulty])

  const newGame = useCallback(() => {
    // Clear pieces first to prevent validation from running
    setPieces([])
    setSelectedPiece(null)
    setGameStatus('playing')
    setTimeRemaining(300)
    setScore(0)
    setHintsUsed(0)
    setHintPiece(null)
    shownHints.current.clear()
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current)
      hintTimeoutRef.current = null
    }
    // Get a different puzzle - this will trigger piece initialization
    const newPuzzle = getRandomPuzzle(difficulty, puzzle?.sourceId)
    setPuzzle(newPuzzle)
  }, [difficulty, puzzle])

  const replayPuzzle = useCallback(() => {
    // Clear pieces first to prevent validation from running on old state
    setPieces([])
    setSelectedPiece(null)
    setGameStatus('playing')
    setTimeRemaining(300)
    setScore(0)
    setHintsUsed(0)
    setHintPiece(null)
    shownHints.current.clear()
    if (hintTimeoutRef.current) {
      clearTimeout(hintTimeoutRef.current)
      hintTimeoutRef.current = null
    }
    // Trigger re-initialization by updating puzzle reference
    setPuzzle(prev => prev ? {...prev} : prev)
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
        
        // Calculate the rotated base average relative to (0,0) to compute tray translation offsets
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
        
        const base = basePolygons[pieceType] || [[0, 0], [50, 0], [50, 50], [0, 50], [0, 0]]
        const radians = (trayLayoutItem.rotation * Math.PI) / 180
        const cos = Math.cos(radians)
        const sin = Math.sin(radians)
        const rotated = base.map(([x, y]) => [
          x * cos - y * sin,
          x * sin + y * cos
        ])
        const rotatedAvgX = rotated.reduce((sum, p) => sum + p[0], 0) / rotated.length
        const rotatedAvgY = rotated.reduce((sum, p) => sum + p[1], 0) / rotated.length
        
        const trayPos = {
          x: trayLayoutItem.cx - rotatedAvgX,
          y: trayLayoutItem.cy - rotatedAvgY,
          rotation: trayLayoutItem.rotation
        }
        
        const standardPolygon = createStandardPolygon(pieceType, trayPos, scale)
        
        const trayCentroidX = standardPolygon.reduce((sum, p) => sum + p[0], 0) / standardPolygon.length
        const trayCentroidY = standardPolygon.reduce((sum, p) => sum + p[1], 0) / standardPolygon.length
        
        return {
          ...piece,
          transform: { x: trayCentroidX, y: trayCentroidY, rotation: trayLayoutItem.rotation - targetRotation },
          currentPolygon: standardPolygon,
          isPlaced: false,
          isSnapped: false
        }
      })
    })
  }, [createStandardPolygon])

  return {
    puzzle,
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
    undoLastMove
  }
}
