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
} from '@/lib/nonogram/types'

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
} from '@/lib/nonogram/helpers'
import { getRandomPuzzle } from '@/data/nonogram'
import { 
  saveGameState, 
  loadGameState, 
  clearGameState,
  updateStatsOnCompletion,
  getHintLimits,
} from '@/lib/nonogram/storage'

export function useNonogram() {
  const searchParams = useSearchParams()
  const urlDifficulty = (searchParams.get('difficulty') || 'easy') as Difficulty

  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [currentPuzzle, setCurrentPuzzle] = useState<PuzzleData | null>(null)
  const [grid, setGrid] = useState<CellState[][]>([])
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  
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
  
  // Drag state
  const [isDragging, setIsDragging] = useState(false)
  const [dragDirection, setDragDirection] = useState<DragDirection>(null)
  const [dragPreviewCells, setDragPreviewCells] = useState<Set<string>>(new Set())
  const dragStartPos = useRef<CellPosition | null>(null)
  const visitedCells = useRef<Set<string>>(new Set())
  
  // Timer ref
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<number | null>(null)

  /**
   * Initialize a new puzzle
   */
  const initializePuzzle = useCallback((diff: Difficulty, loadSaved = true) => {
    // Try to load saved game first
    if (loadSaved && typeof window !== 'undefined') {
      const saved = loadGameState()
      if (saved && saved.difficulty === diff) {
        const puzzle = getRandomPuzzle(diff)
        // Find the exact puzzle by ID
        setCurrentPuzzle(puzzle)
        setGrid(saved.grid)
        setElapsedSeconds(saved.elapsedSeconds)
        setHintsUsed(saved.hintsUsed)
        setMaxHints(getHintLimits(diff))
        setGameStatus('playing')
        return
      }
    }

    // Load new puzzle
    const puzzle = getRandomPuzzle(diff)
    const emptyGrid = createEmptyGrid(puzzle.size)
    
    setCurrentPuzzle(puzzle)
    setGrid(emptyGrid)
    setSelectedCell(null)
    setElapsedSeconds(0)
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
  }, [])

  /**
   * Sync with URL difficulty on mount/change
   */
  useEffect(() => {
    if (typeof window !== 'undefined' && !isInitialized) {
      const valid = ['easy', 'medium', 'hard']
      const currentDiff = valid.includes(urlDifficulty) ? urlDifficulty : 'easy'
      
      setDifficulty(currentDiff)
      initializePuzzle(currentDiff)
      setIsInitialized(true)
    }
  }, [urlDifficulty, isInitialized, initializePuzzle])

  /**
   * Timer management
   */
  useEffect(() => {
    if (gameStatus === 'playing') {
      if (startTimeRef.current === null) {
        startTimeRef.current = Date.now() - (elapsedSeconds * 1000)
      }

      timerRef.current = setInterval(() => {
        if (startTimeRef.current !== null) {
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
          setElapsedSeconds(elapsed)
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
  }, [gameStatus, elapsedSeconds])

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
        mistakeCount: 0,
        timestamp: Date.now(),
      })
    }
  }, [grid, currentPuzzle, difficulty, elapsedSeconds, hintsUsed, gameStatus, isInitialized])

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
      clearGameState()
    }
  }, [grid, currentPuzzle, gameStatus, elapsedSeconds])

  /**
   * Apply cell action based on input mode
   */
  const applyCellAction = useCallback((position: CellPosition, mode: InputMode): CellState => {
    const currentState = grid[position.row][position.col]
    
    if (mode === 'fill') {
      // Fill Mode: empty <-> filled
      return currentState === 'filled' ? 'empty' : 'filled'
    } else {
      // Mark Mode: empty <-> marked
      return currentState === 'marked' ? 'empty' : 'marked'
    }
  }, [grid])

  /**
   * Handle cell click - apply action based on active input mode
   */
  const handleCellClick = useCallback((position: CellPosition) => {
    if (gameStatus !== 'playing' || !currentPuzzle || isDragging) return
    
    setSelectedCell(position)
    
    const newState = applyCellAction(position, inputMode)
    
    // Validate if not returning to empty and assisted mode is on
    if (newState !== 'empty' && validationMode === 'assisted') {
      const tempGrid = grid.map(row => [...row])
      tempGrid[position.row][position.col] = newState
      const isMistake = isCellMistake(tempGrid, currentPuzzle.solution, position)
      
      if (isMistake) {
        // Show error feedback with shake
        setGrid((prevGrid) => {
          const newGrid = prevGrid.map((row) => [...row])
          newGrid[position.row][position.col] = 'error'
          return newGrid
        })
        
        // Revert after shake animation (1 second)
        setTimeout(() => {
          setGrid((prevGrid) => {
            const newGrid = prevGrid.map((row) => [...row])
            newGrid[position.row][position.col] = 'empty'
            return newGrid
          })
        }, 1000)
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
    visitedCells.current = new Set([getCellKey(position)])
    
    // Show preview for starting cell
    setDragPreviewCells(new Set([getCellKey(position)]))
  }, [currentPuzzle, gameStatus])

  // Continue drag
  const handleDragEnter = useCallback((position: CellPosition) => {
    if (!isDragging || !dragStartPos.current || !currentPuzzle) return
    
    const cellKey = getCellKey(position)
    
    // Skip if already visited
    if (visitedCells.current.has(cellKey)) return
    
    // Determine and enforce direction lock
    const direction = determineDragDirection(dragStartPos.current, position)
    
    // Set direction on first move
    if (dragDirection === null && direction !== null) {
      setDragDirection(direction)
    }
    
    // Enforce direction lock - only update cells in locked direction
    const currentDirection = dragDirection || direction
    if (currentDirection === 'horizontal' && position.row !== dragStartPos.current.row) {
      return // Ignore cells outside locked row
    }
    if (currentDirection === 'vertical' && position.col !== dragStartPos.current.col) {
      return // Ignore cells outside locked column
    }
    
    // Mark as visited
    visitedCells.current.add(cellKey)
    
    // Add to preview cells
    setDragPreviewCells((prev) => new Set([...prev, cellKey]))
  }, [isDragging, dragDirection, currentPuzzle])

  // Handle pointer move - detect cell under pointer
  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging || isPinching) return
    
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
  }, [isDragging, isPinching, handleDragEnter])

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
    
    const cellsToUpdate = Array.from(visitedCells.current)
    
    // Apply changes sequentially with 30ms stagger for flip effect
    cellsToUpdate.forEach((cellKey, index) => {
      setTimeout(() => {
        const [rowStr, colStr] = cellKey.split('-')
        const position: CellPosition = { row: parseInt(rowStr), col: parseInt(colStr) }
        
        const newState = applyCellAction(position, inputMode)
        
        // Validate if not returning to empty
        if (newState !== 'empty' && validationMode === 'assisted' && currentPuzzle) {
          const tempGrid = grid.map(row => [...row])
          tempGrid[position.row][position.col] = newState
          const isMistake = isCellMistake(tempGrid, currentPuzzle.solution, position)
          
          if (isMistake) {
            // Show error feedback with shake
            setGrid((prevGrid) => {
              const newGrid = prevGrid.map((row) => [...row])
              newGrid[position.row][position.col] = 'error'
              return newGrid
            })
            
            // Revert after shake animation
            setTimeout(() => {
              setGrid((prevGrid) => {
                const newGrid = prevGrid.map((row) => [...row])
                newGrid[position.row][position.col] = 'empty'
                return newGrid
              })
            }, 1000)
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
      visitedCells.current.clear()
    }, cellsToUpdate.length * 30 + 100)
  }, [isDragging, inputMode, applyCellAction, validationMode, currentPuzzle, grid])

  /**
   * Reset the current puzzle
   */
  const resetPuzzle = useCallback(() => {
    if (currentPuzzle) {
      const emptyGrid = createEmptyGrid(currentPuzzle.size)
      setGrid(emptyGrid)
      setSelectedCell(null)
      setElapsedSeconds(0)
      setHintsUsed(0)
      setGameStatus('playing')
      setRowValidation(Array(currentPuzzle.size).fill('incomplete'))
      setColumnValidation(Array(currentPuzzle.size).fill('incomplete'))
      setInputMode('fill')
      startTimeRef.current = null
      clearGameState()
    }
  }, [currentPuzzle])

  /**
   * Start a new puzzle
   */
  const newPuzzle = useCallback(() => {
    initializePuzzle(difficulty, false)
  }, [difficulty, initializePuzzle])

  /**
   * Change difficulty
   */
  const changeDifficulty = useCallback((newDifficulty: Difficulty) => {
    setDifficulty(newDifficulty)
    initializePuzzle(newDifficulty, false)
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
        
        if (!selectedCell) {
          setSelectedCell({ row: 0, col: 0 })
          return
        }

        let newRow = selectedCell.row
        let newCol = selectedCell.col

        switch (e.key) {
          case 'ArrowUp':
            newRow = Math.max(0, selectedCell.row - 1)
            break
          case 'ArrowDown':
            newRow = Math.min(currentPuzzle.size - 1, selectedCell.row + 1)
            break
          case 'ArrowLeft':
            newCol = Math.max(0, selectedCell.col - 1)
            break
          case 'ArrowRight':
            newCol = Math.min(currentPuzzle.size - 1, selectedCell.col + 1)
            break
        }

        setSelectedCell({ row: newRow, col: newCol })
      }

      // Space - Apply active mode
      if (selectedCell && e.key === ' ') {
        e.preventDefault()
        handleCellClick(selectedCell)
      }

      // Backspace or Delete to clear cell
      if (selectedCell && (e.key === 'Backspace' || e.key === 'Delete')) {
        e.preventDefault()
        setGrid((prevGrid) => {
          const newGrid = prevGrid.map((row) => [...row])
          newGrid[selectedCell.row][selectedCell.col] = 'empty'
          return newGrid
        })
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedCell, gameStatus, currentPuzzle, handleCellClick])

  return {
    // State
    grid,
    selectedCell,
    difficulty,
    currentPuzzle,
    isInitialized,
    gameStatus,
    elapsedSeconds,
    rowValidation,
    columnValidation,
    progress,
    hintsUsed,
    maxHints,
    errorCell,
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
  }
}
