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
import { getRandomPuzzle, getPuzzleById } from '@shared/data/nonogram'
import { 
  saveGameState, 
  loadGameState, 
  clearGameState,
  updateStatsOnCompletion,
  getHintLimits,
} from '@shared/lib/nonogram/storage'
import { markPuzzleCompleted } from '@shared/lib/completion/universal'
import { gameApi } from '@/lib/api/gameApi'

import { dailyPuzzles } from '@shared/data/nonogram'

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

function getDailyNonogramPuzzle(date: Date): PuzzleData {
  const dayOfYear = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000)
  const index = Math.abs(dayOfYear) % dailyPuzzles.length
  return dailyPuzzles[index]
}

export function useNonogram(initialPuzzleId?: string) {
  const searchParams = useSearchParams()
  const urlDifficulty = (searchParams.get('difficulty') || 'easy') as Difficulty

  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [currentPuzzle, setCurrentPuzzle] = useState<PuzzleData | null>(null)
  const [grid, setGrid] = useState<CellState[][]>([])
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null)
  const [selectionHistory, setSelectionHistory] = useState<CellPosition[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  const [loading, setLoading] = useState(false)
  const initTokenRef = useRef(0)
  
  // Check if this is from daily challenge
  const dateParam = searchParams.get('date')
  const isDailyChallenge = !!dateParam || (typeof window !== 'undefined' && window.location.pathname.includes('/daily-challenge/'))
  
  // Phase 3: Input mode system
  const [inputMode, setInputMode] = useState<InputMode>('fill')
  const [validationMode, setValidationMode] = useState<ValidationMode>('assisted')
  
  // Phase 2: Game state
  const [gameStatus, setGameStatus] = useState<GameStatus>('playing')
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
  
  // Hovered Cell and Mouse coordinates for tooltip
  const [hoveredCell, setHoveredCell] = useState<CellPosition | null>(null)
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null)

  // Drag state
  const [isDragging, setIsDragging] = useState(false)
  const [dragDirection, setDragDirection] = useState<DragDirection>(null)
  const [dragPreviewCells, setDragPreviewCells] = useState<Set<string>>(new Set())
  const dragStartPos = useRef<CellPosition | null>(null)
  
  const hasDraggedRef = useRef(false)
  const wasDraggingRef = useRef(false)
  
  // Timer ref
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)
  
  // Guard to prevent duplicate click/tap actions (pointer events vs click event race condition)
  const lastInteractionRef = useRef<{ row: number; col: number; timestamp: number } | null>(null)
  
  // Track action type during dragging
  const dragActionRef = useRef<'fill' | 'erase' | 'mark' | 'unmark' | null>(null)


  /**
   * Initialize a new puzzle
   */
  const initializePuzzle = useCallback(async (diff: Difficulty, loadSaved = true, puzzleId?: string) => {
    // Load new puzzle (async fetch from API with static fallback + cache)
    const token = ++initTokenRef.current
    let cancelled = false

    const applyPuzzle = (puzzle: PuzzleData) => {
      if (token !== initTokenRef.current) return
      setCurrentPuzzle(puzzle)
      setGrid(createEmptyGrid(puzzle.size))
      setMistakeCount(0)
      setSelectionHistory([])
      
      // Set initial countdown time based on estimatedTime
      setElapsedSeconds(puzzle.estimatedTime || (diff === 'expert' ? 1200 : diff === 'hard' ? 900 : diff === 'medium' ? 600 : 300))
      
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
    try {
      let puzzle: PuzzleData
      try {
        if (puzzleId) {
          const cached = readCache(puzzleId)
          if (cached) {
            puzzle = cached
          } else {
            const res = await gameApi.getPuzzleById('nonogram', puzzleId)
            puzzle = res as unknown as PuzzleData
            writeCache(puzzle.id, puzzle)
          }
        } else if (isDailyChallenge) {
          const res = await gameApi.getDailyPuzzle('nonogram', dateParam || undefined)
          puzzle = res as unknown as PuzzleData
          writeCache(puzzle.id, puzzle)
        } else {
          const res = await gameApi.getPuzzle('nonogram', { difficulty: diff })
          puzzle = res as unknown as PuzzleData
          writeCache(puzzle.id, puzzle)
        }
      } catch {
        // Static fallback
        if (puzzleId) {
          const foundPuzzle = getPuzzleById(puzzleId)
          if (foundPuzzle) {
            puzzle = foundPuzzle
          } else {
            console.warn(`Puzzle ${puzzleId} not found, using random puzzle`)
            puzzle = getRandomPuzzle(diff)
          }
        } else if (isDailyChallenge) {
          let dailyDate = new Date()
          if (dateParam) {
            const [month, day, year] = dateParam.split('-')
            const fullYear = 2000 + parseInt(year)
            dailyDate = new Date(fullYear, parseInt(month) - 1, parseInt(day))
          }
          puzzle = getDailyNonogramPuzzle(dailyDate)
        } else {
          puzzle = getRandomPuzzle(diff)
        }
      }
      if (cancelled) return

      const targetPuzzleId = isDailyChallenge && dateParam ? `daily-nonogram-${dateParam}` : puzzle.id

      if (loadSaved && typeof window !== 'undefined') {
        const saved = loadGameState()
        if (saved && saved.puzzleId === targetPuzzleId && saved.difficulty === diff) {
          setCurrentPuzzle(puzzle)
          setGrid(saved.grid)
          setMistakeCount(saved.mistakeCount)
          setElapsedSeconds(saved.elapsedSeconds)
          setGameStatus('playing') // always resume as playing
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
          return
        }
      }

      applyPuzzle(puzzle)
    } finally {
      if (!cancelled) setLoading(false)
    }
  }, [isDailyChallenge, dateParam])

  /**
   * Sync with URL difficulty on mount/change
   */
  useEffect(() => {
    if (typeof window !== 'undefined' && !isInitialized) {
      const valid = ['easy', 'medium', 'hard', 'expert']
      const currentDiff = valid.includes(urlDifficulty) ? urlDifficulty : 'easy'
      
      setDifficulty(currentDiff)
      // Use provided puzzleId or let initializePuzzle use random
      initializePuzzle(currentDiff, true, initialPuzzleId)
      setIsInitialized(true)
    }
  }, [urlDifficulty, isInitialized, initialPuzzleId, initializePuzzle])

  /**
   * Timer management
   */
  useEffect(() => {
    if (gameStatus === 'playing') {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!)
            setGameStatus('lost')
            clearGameState()
            return 0
          }
          return prev - 1
        })
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
  }, [gameStatus])

  /**
   * Auto-save game state
   */
  useEffect(() => {
    if (isInitialized && gameStatus === 'playing' && currentPuzzle) {
      saveGameState({
        grid,
        puzzleId: currentPuzzle.id,
        difficulty,
        elapsedSeconds,
        hintsUsed,
        mistakeCount,
        timestamp: Date.now(),
      })
    }
  }, [grid, currentPuzzle, difficulty, elapsedSeconds, hintsUsed, mistakeCount, gameStatus, isInitialized])

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

      // Also report completion to the API when logged in (fire-and-forget)
      if (typeof window !== 'undefined' && localStorage.getItem('accessToken')) {
        void gameApi.complete('nonogram', {
          puzzleId: currentPuzzle.id,
          difficulty: currentPuzzle.difficulty as 'easy' | 'medium' | 'hard' | 'expert',
          score: undefined,
          time: elapsedSeconds,
          hintsUsed: hintsUsed,
          mistakes: mistakeCount,
          moves: undefined,
        }).catch(() => {
          // best-effort; ignore failures
        })
      }
      
      clearGameState()
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
  }, [grid])

  /**
   * Handle cell click - apply action based on active input mode
   */
  const handleCellClick = useCallback((position: CellPosition) => {
    if (gameStatus !== 'playing' || !currentPuzzle || isDragging) return
    if (wasDraggingRef.current) return
    
    // Prevent double processing from race condition between pointer/drag and click handlers
    const now = Date.now()
    if (
      lastInteractionRef.current &&
      lastInteractionRef.current.row === position.row &&
      lastInteractionRef.current.col === position.col &&
      now - lastInteractionRef.current.timestamp < 350
    ) {
      return
    }
    lastInteractionRef.current = { row: position.row, col: position.col, timestamp: now }

    setSelectedCell(position)
    
    const newState = applyCellAction(position, inputMode)
    
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
          setGrid((prevGrid) => {
            const newGrid = prevGrid.map((row) => [...row])
            newGrid[position.row][position.col] = 'error'
            return newGrid
          })
          return
        }
    }
    
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

  // Helper: Determine drag direction
  const determineDragDirection = (
    start: CellPosition,
    current: CellPosition
  ): DragDirection => {
    const rowDiff = Math.abs(current.row - start.row)
    const colDiff = Math.abs(current.col - start.col)
    
    if (rowDiff === 0 && colDiff === 0) return null
    
    // Lock to dominant direction
    if (rowDiff > colDiff) return 'vertical'
    if (colDiff > rowDiff) return 'horizontal'
    
    // Equal movement - keep previous direction or default to horizontal
    return dragDirection || 'horizontal'
  }

  // Start drag
  const handleDragStart = useCallback((position: CellPosition) => {
    if (gameStatus !== 'playing' || !currentPuzzle) return
    
    setIsDragging(true)
    setDragDirection(null)
    dragStartPos.current = position
    
    // Determine the action based on the starting cell state and inputMode
    const startState = grid[position.row]?.[position.col]
    if (inputMode === 'fill') {
      dragActionRef.current = (startState === 'filled' || startState === 'error') ? 'erase' : 'fill'
    } else {
      dragActionRef.current = startState === 'marked' ? 'unmark' : 'mark'
    }
    
    // Show preview for starting cell
    setDragPreviewCells(new Set([getCellKey(position)]))
    hasDraggedRef.current = false
  }, [currentPuzzle, gameStatus, grid, inputMode])

  // Continue drag
  const handleDragEnter = useCallback((position: CellPosition) => {
    if (!isDragging || !dragStartPos.current || !currentPuzzle) return
    
    // Determine and enforce direction lock
    const direction = determineDragDirection(dragStartPos.current, position)
    
    // Set direction on first move
    if (dragDirection === null && direction !== null) {
      setDragDirection(direction)
    }
    
    const currentDirection = dragDirection || direction
    if (currentDirection === null) return
    
    // Enforce direction lock - only update cells in locked direction
    if (currentDirection === 'horizontal' && position.row !== dragStartPos.current.row) {
      return // Ignore cells outside locked row
    }
    if (currentDirection === 'vertical' && position.col !== dragStartPos.current.col) {
      return // Ignore cells outside locked column
    }
    
    const start = dragStartPos.current
    const newPreviewKeys = new Set<string>()
    
    if (currentDirection === 'horizontal') {
      const minCol = Math.min(start.col, position.col)
      const maxCol = Math.max(start.col, position.col)
      for (let c = minCol; c <= maxCol; c++) {
        newPreviewKeys.add(`${start.row}-${c}`)
      }
    } else {
      const minRow = Math.min(start.row, position.row)
      const maxRow = Math.max(start.row, position.row)
      for (let r = minRow; r <= maxRow; r++) {
        newPreviewKeys.add(`${r}-${start.col}`)
      }
    }
    
    setDragPreviewCells(newPreviewKeys)
    hasDraggedRef.current = newPreviewKeys.size > 1
  }, [isDragging, dragDirection, currentPuzzle, determineDragDirection])

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

  // End drag - apply changes with sequential flip animation
  const handleDragEnd = useCallback(() => {
    if (!isDragging) return
    
    if (!hasDraggedRef.current) {
      setIsDragging(false)
      setDragDirection(null)
      setDragPreviewCells(new Set())
      dragStartPos.current = null
      return
    }

    wasDraggingRef.current = true
    setTimeout(() => {
      wasDraggingRef.current = false
    }, 100)
    
    const cellsToUpdate = Array.from(dragPreviewCells)
    
    // Apply changes sequentially with 30ms stagger for flip effect
    cellsToUpdate.forEach((cellKey, index) => {
      setTimeout(() => {
        const [rowStr, colStr] = cellKey.split('-')
        const position: CellPosition = { row: parseInt(rowStr), col: parseInt(colStr) }
        
        // Mark as handled to prevent click handler from double-firing
        lastInteractionRef.current = { row: position.row, col: position.col, timestamp: Date.now() }
        
        const newState = applyCellAction(position, inputMode, true)
        
        // Only validate Fill mode during drag - Mark mode (flags) can be placed anywhere
        // Skip validation if the cell is already an error (don't count same mistake twice)
        if (inputMode === 'fill' && newState === 'filled' && validationMode === 'assisted' && currentPuzzle && grid[position.row][position.col] !== 'error') {
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
            setGrid((prevGrid) => {
              const newGrid = prevGrid.map((row) => [...row])
              newGrid[position.row][position.col] = 'error'
              return newGrid
            })
            return
          }
        }
        
        // Apply the state change
        setGrid((prevGrid) => {
          const newGrid = prevGrid.map((row) => [...row])
          newGrid[position.row][position.col] = newState
          return newGrid
        })
      }, index * 30)
    })
    
    // Clean up drag state after all animations start
    setTimeout(() => {
      setIsDragging(false)
      setDragDirection(null)
      setDragPreviewCells(new Set())
      dragStartPos.current = null
    }, cellsToUpdate.length * 30 + 100)
  }, [isDragging, dragPreviewCells, inputMode, applyCellAction, validationMode, currentPuzzle, grid, difficulty])

  /**
   * Reset the current puzzle
   */
  const resetPuzzle = useCallback(() => {
    if (currentPuzzle) {
      const emptyGrid = createEmptyGrid(currentPuzzle.size)
      setGrid(emptyGrid)
      setSelectedCell(null)
      setSelectionHistory([])
      const initialSeconds = currentPuzzle.estimatedTime || (difficulty === 'expert' ? 1200 : difficulty === 'hard' ? 900 : difficulty === 'medium' ? 600 : 300)
      setElapsedSeconds(initialSeconds)
      setHintsUsed(0)
      setMistakeCount(0)
      setGameStatus('playing')
      setRowValidation(Array(currentPuzzle.size).fill('incomplete'))
      setColumnValidation(Array(currentPuzzle.size).fill('incomplete'))
      setInputMode('fill')
      startTimeRef.current = null
      clearGameState()
    }
  }, [currentPuzzle, difficulty])

  /**
   * Start a new puzzle
   */
  const newPuzzle = useCallback((puzzleId?: string) => {
    // Use current puzzle's difficulty, not URL or state
    // This ensures "New Puzzle" respects the mode you're currently playing
    const currentDiff = currentPuzzle?.difficulty || difficulty
    
    // Initialize puzzle with CURRENT difficulty
    initializePuzzle(currentDiff, false, puzzleId)
  }, [currentPuzzle, difficulty, initializePuzzle])

  /**
   * Change difficulty
   */
  const changeDifficulty = useCallback((newDifficulty: Difficulty, puzzleId?: string) => {
    setDifficulty(newDifficulty)
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

      // Arrow keys for navigation
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault()
        
        const baseCell = hoveredCell || selectedCell
        
        if (!baseCell) {
          setSelectedCell({ row: 0, col: 0 })
          setHoveredCell({ row: 0, col: 0 })
          return
        }

        let newRow = baseCell.row
        let newCol = baseCell.col

        switch (e.key) {
          case 'ArrowUp':
            newRow = Math.max(0, baseCell.row - 1)
            break
          case 'ArrowDown':
            newRow = Math.min(currentPuzzle.size - 1, baseCell.row + 1)
            break
          case 'ArrowLeft':
            newCol = Math.max(0, baseCell.col - 1)
            break
          case 'ArrowRight':
            newCol = Math.min(currentPuzzle.size - 1, baseCell.col + 1)
            break
        }

        setSelectedCell({ row: newRow, col: newCol })
        setHoveredCell({ row: newRow, col: newCol })
      }

      // Enter - Move to next cell in row-major order
      if (selectedCell && e.key === 'Enter') {
        e.preventDefault()
        const size = currentPuzzle.size
        const nextCol = (selectedCell.col + 1) % size
        const nextRow = nextCol === 0 ? (selectedCell.row + 1) % size : selectedCell.row
        
        setSelectedCell({ row: nextRow, col: nextCol })
        setHoveredCell({ row: nextRow, col: nextCol })
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
    changeDifficulty,
    useHint,
    autoFill,
    setInputMode,
    setValidationMode,
    setHoveredCell,
    setMousePosition,
  }
}
