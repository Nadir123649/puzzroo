'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lightbulb, Flag, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import { useNonogram } from '@/hooks/useNonogram'
import { NonogramModal } from './NonogramModal'
import { GameLoader } from '@/components/ui/GameLoader'
import { InputModeToolbar } from '@/components/games/nonogram/InputModeToolbar'
import { formatTime } from '@/lib/nonogram/helpers'
import type { CellPosition } from '@/lib/nonogram/types'

export function NonogramGame({ puzzleId, onBackToSelection }: { puzzleId?: string; onBackToSelection?: () => void }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Check if this is from past puzzles or daily challenge (has date param)
  const dateParam = searchParams?.get('date')
  const isFromPastPuzzles = !!dateParam
  
  const {
    grid,
    selectedCell,
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
    mistakeCount,
    maxMistakes,
    isDragging,
    dragPreviewCells,
    inputMode,
    handleCellClick,
    handleDragStart,
    handleDragEnd,
    resetPuzzle,
    newPuzzle,
    useHint,
    autoFill,
    setInputMode,
  } = useNonogram(puzzleId)

  const [isResetting, setIsResetting] = useState(false)
  const [loaderText, setLoaderText] = useState('Loading game...')

  const handleReplay = async () => {
    setLoaderText('Replaying game...')
    setIsResetting(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    resetPuzzle()
    setIsResetting(false)
  }

  const handleNewPuzzle = async () => {
    setLoaderText('Loading game...')
    setIsResetting(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    newPuzzle()
    setIsResetting(false)
  }

  const [windowWidth, setWindowWidth] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(1) // 1 = 100%, 0.6 = 60%, 1.5 = 150%
  const [isPinching, setIsPinching] = useState(false)
  const [hoveredCell, setHoveredCell] = useState<CellPosition | null>(null)
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null)
  const initialPinchDistance = useRef<number>(0)
  const initialZoomLevel = useRef<number>(1)

  const boardContainerRef = useRef<HTMLDivElement>(null)
  const scrollbarContainerRef = useRef<HTMLDivElement>(null)
  const isSyncingScroll = useRef(false)

  const handleBoardScroll = () => {
    if (isSyncingScroll.current) return
    isSyncingScroll.current = true
    if (scrollbarContainerRef.current && boardContainerRef.current) {
      scrollbarContainerRef.current.scrollLeft = boardContainerRef.current.scrollLeft
    }
    window.requestAnimationFrame(() => {
      isSyncingScroll.current = false
    })
  }

  const handleScrollbarScroll = () => {
    if (isSyncingScroll.current) return
    isSyncingScroll.current = true
    if (boardContainerRef.current && scrollbarContainerRef.current) {
      boardContainerRef.current.scrollLeft = scrollbarContainerRef.current.scrollLeft
    }
    window.requestAnimationFrame(() => {
      isSyncingScroll.current = false
    })
  }


  useEffect(() => {
    const updateWidth = () => setWindowWidth(window.innerWidth)
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  // Track mouse position for tooltip
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (hoveredCell) {
        setMousePosition({ x: e.clientX, y: e.clientY })
        
        // During drag, update hoveredCell based on element under cursor
        if (isDragging) {
          const element = document.elementFromPoint(e.clientX, e.clientY)
          if (element) {
            const cellButton = element.closest('button[data-cell-position]')
            if (cellButton) {
              const positionData = cellButton.getAttribute('data-cell-position')
              if (positionData) {
                const [row, col] = positionData.split('-').map(Number)
                if (!isNaN(row) && !isNaN(col)) {
                  setHoveredCell({ row, col })
                }
              }
            }
          }
        }
      }
    }

    if (hoveredCell) {
      window.addEventListener('mousemove', handleMouseMove)
      return () => window.removeEventListener('mousemove', handleMouseMove)
    } else {
      setMousePosition(null)
    }
  }, [hoveredCell, isDragging])

  // Pinch zoom handler
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        setIsPinching(true)
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        )
        initialPinchDistance.current = distance
        initialZoomLevel.current = zoomLevel
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (isPinching && e.touches.length === 2) {
        e.preventDefault()
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        const distance = Math.hypot(
          touch2.clientX - touch1.clientX,
          touch2.clientY - touch1.clientY
        )
        const scale = distance / initialPinchDistance.current
        const newZoom = Math.max(0.6, Math.min(1.5, initialZoomLevel.current * scale))
        setZoomLevel(newZoom)
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        setIsPinching(false)
      }
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: false })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isPinching, zoomLevel])

  // Dynamic cell sizing based on screen width and difficulty with zoom
  const cellSize = useMemo(() => {
    if (!currentPuzzle || windowWidth === 0) return 32
    
    const gridSize = currentPuzzle.size
    const padding = 40 // Container padding
    const borderSpace = 8 // Border thickness and spacing
    const availableWidth = windowWidth - padding
    
    // Calculate max row clue width
    const maxRowClueCount = Math.max(...currentPuzzle.rowClues.map(c => c.values.length), 1)
    const maxColClueCount = Math.max(...currentPuzzle.columnClues.map(c => c.values.length), 1)
    
    // Estimate clue sizes - they should scale with cell size
    let baseSize: number
    
    if (windowWidth < 640) {
      // Mobile: need to fit everything without horizontal scroll
      // For hard puzzles (20x20), cells need to be smaller
      let clueWidthPerCount = gridSize >= 20 ? 16 : (gridSize >= 15 ? 18 : 22)
      const maxClueWidth = maxRowClueCount * clueWidthPerCount
      const availableForGrid = availableWidth - maxClueWidth - borderSpace
      baseSize = Math.floor(availableForGrid / gridSize)
      
      // Minimum sizes based on grid size
      if (gridSize >= 20) {
        baseSize = Math.max(14, Math.min(20, baseSize)) // Hard: 14-20px
      } else if (gridSize >= 15) {
        baseSize = Math.max(16, Math.min(22, baseSize)) // Medium: 16-22px
      } else {
        baseSize = Math.max(20, Math.min(26, baseSize)) // Easy: 20-26px
      }
    } else if (windowWidth < 768) {
      // Small tablet
      let clueWidthPerCount = gridSize >= 20 ? 20 : (gridSize >= 15 ? 22 : 26)
      const maxClueWidth = maxRowClueCount * clueWidthPerCount
      const availableForGrid = availableWidth - maxClueWidth - borderSpace
      baseSize = Math.floor(availableForGrid / gridSize)
      
      if (gridSize >= 20) {
        baseSize = Math.max(18, Math.min(24, baseSize))
      } else if (gridSize >= 15) {
        baseSize = Math.max(20, Math.min(26, baseSize))
      } else {
        baseSize = Math.max(24, Math.min(30, baseSize))
      }
    } else if (windowWidth < 1024) {
      // Tablet
      const maxClueWidth = maxRowClueCount * 30
      const availableForGrid = Math.min(availableWidth, 717.5) - maxClueWidth - borderSpace
      baseSize = Math.floor(availableForGrid / gridSize)
      baseSize = Math.max(24, Math.min(34, baseSize))
    } else {
      // Desktop
      const maxClueWidth = maxRowClueCount * 34
      const availableForGrid = Math.min(availableWidth, 717.5) - maxClueWidth - borderSpace
      baseSize = Math.floor(availableForGrid / gridSize)
      baseSize = Math.max(26, Math.min(40, baseSize))
    }
    
    // Apply zoom level
    return Math.floor(baseSize * zoomLevel)
  }, [currentPuzzle, windowWidth, zoomLevel])

  const handleBackToGames = () => {
    const params = new URLSearchParams(window.location.search)
    const hasDate = params.has('date')
    const returnUrl = hasDate ? (typeof window !== 'undefined' ? sessionStorage.getItem('puzzroo_return_url') : null) : null
    if (returnUrl) {
      sessionStorage.removeItem('puzzroo_return_url')
      router.push(returnUrl)
    } else {
      router.push('/game/nonogram')
    }
  }

  // These must be computed before any early return to satisfy Rules of Hooks
  const maxRowClueCount = currentPuzzle ? Math.max(...currentPuzzle.rowClues.map(c => c.values.length), 1) : 1
  const maxColClueCount = currentPuzzle ? Math.max(...currentPuzzle.columnClues.map(c => c.values.length), 1) : 1

  // Clue size should also scale with zoom
  const clueSize = cellSize
  const cornerWidth = maxRowClueCount * clueSize
  const cornerHeight = maxColClueCount * clueSize

  const isOverflowing = useMemo(() => {
    if (!currentPuzzle || windowWidth === 0) return false
    const boardWidth = cornerWidth + currentPuzzle.size * cellSize
    const containerWidth = Math.min(windowWidth - 40, 717.5)
    return boardWidth > containerWidth
  }, [currentPuzzle, windowWidth, cornerWidth, cellSize])

  if (!isInitialized || !currentPuzzle || rowValidation.length === 0 || columnValidation.length === 0) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#181A20]">
        <GameLoader isOpen={true} text="Loading game..." />
      </div>
    )
  }


  const canUseHint = hintsUsed < maxHints && gameStatus === 'playing'

  return (
    <>
      <section className="w-full bg-white dark:bg-[#181A20] transition-colors duration-300">
        <div className="w-full px-[20px] pb-[40px] flex justify-center">
          <div className="w-full max-w-[717.5px] flex flex-col items-center gap-[20px]">
            
            {/* Timer and Progress Bar */}
            <div className="w-full flex flex-col gap-3">
              {/* Puzzle Metadata */}
              <div className="text-center space-y-1">
                <h2 className="font-urbanist text-[24px] md:text-[28px] font-bold text-[#2B2F3A] dark:text-white">
                  {currentPuzzle.title}
                </h2>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E8DFFF] dark:bg-[#3D2F7A] font-urbanist text-[12px] font-semibold text-[#6949FF] dark:text-[#A592FF]">
                    <span className="capitalize">{currentPuzzle.category}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5F6FA] dark:bg-[#35383F] font-urbanist text-[12px] font-semibold text-[#616161] dark:text-[#A0A4B8]">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    <span>~{Math.floor(currentPuzzle.estimatedTime / 60)} min</span>
                  </span>
                </div>
              </div>
              
              {/* Timer */}
              <div className="flex justify-center">
                <div className="bg-[#F5F6FA] dark:bg-[#35383F] rounded-full px-6 py-2">
                  <span className="font-urbanist text-[20px] font-bold text-[#2B2F3A] dark:text-white font-mono">
                    {formatTime(elapsedSeconds)}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-urbanist text-[14px] font-medium text-[#424242] dark:text-[#E0E0E0]">
                    Progress
                  </span>
                  <span className="font-urbanist text-[14px] font-bold text-[var(--color-primary)]">
                    {progress.percentComplete}%
                  </span>
                </div>
                <div className="w-full h-3 bg-[#F5F6FA] dark:bg-[#35383F] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#6949FF] to-[#8B6EFF] transition-all duration-300 ease-out"
                    style={{ width: `${progress.percentComplete}%` }}
                  />
                </div>
                <div className="mt-1 text-center">
                  <span className="font-urbanist text-[12px] text-[#616161] dark:text-[#A0A4B8]">
                    {progress.correctCellsFilled} / {progress.totalCellsRequired} cells
                  </span>
                </div>
              </div>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button
                onClick={() => setZoomLevel(Math.max(0.6, zoomLevel - 0.1))}
                className="w-8 h-8 rounded-full bg-[#E8DFFF] dark:bg-[#3D2F7A] hover:bg-[#D4C5F9] dark:hover:bg-[#4A3A8C] text-[#6949FF] dark:text-[#A592FF] flex items-center justify-center transition-all duration-200 active:scale-95"
                aria-label="Zoom out"
                title="Zoom out"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                  <line x1="8" y1="11" x2="14" y2="11"/>
                </svg>
              </button>
              <span className="font-urbanist text-[12px] font-medium text-[#616161] dark:text-[#A0A4B8] min-w-[45px] text-center">
                {Math.round(zoomLevel * 100)}%
              </span>
              <button
                onClick={() => setZoomLevel(Math.min(1.5, zoomLevel + 0.1))}
                className="w-8 h-8 rounded-full bg-[#E8DFFF] dark:bg-[#3D2F7A] hover:bg-[#D4C5F9] dark:hover:bg-[#4A3A8C] text-[#6949FF] dark:text-[#A592FF] flex items-center justify-center transition-all duration-200 active:scale-95"
                aria-label="Zoom in"
                title="Zoom in"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <path d="m21 21-4.35-4.35"/>
                  <line x1="11" y1="8" x2="11" y2="14"/>
                  <line x1="8" y1="11" x2="14" y2="11"/>
                </svg>
              </button>
              <button
                onClick={() => setZoomLevel(1)}
                className="ml-1 px-2 h-8 rounded-full bg-[#E8DFFF] dark:bg-[#3D2F7A] hover:bg-[#D4C5F9] dark:hover:bg-[#4A3A8C] font-urbanist text-[11px] font-medium text-[#6949FF] dark:text-[#A592FF] transition-all duration-200 active:scale-95"
                title="Reset zoom"
              >
                Reset
              </button>
              <span className="font-urbanist font-bold text-[14px] text-[var(--color-primary)] ml-3" style={{ fontVariantNumeric: 'tabular-nums' }}>
                Mistakes: {mistakeCount}/{maxMistakes}
              </span>
            </div>

            {/* Input Mode Toolbar */}
            <InputModeToolbar
              activeMode={inputMode}
              onModeChange={setInputMode}
              disabled={gameStatus !== 'playing'}
              maxWidth={cornerWidth + (currentPuzzle.size * cellSize)}
            />

            {/* Game Board — scrollable container with stable outer width and custom scrollbar hidden */}
            <div
              ref={boardContainerRef}
              onScroll={handleBoardScroll}
              className="w-full overflow-x-auto pb-2 hide-scrollbar flex justify-center"
              style={{ WebkitOverflowScrolling: 'touch' } as React.CSSProperties}
            >
              <div className="inline-flex flex-col border-2 border-[#D0D3DC] dark:border-[#616161] mx-auto">
                
                {/* Top: Corner + Column Clues */}
                <div className="flex">
                  <div 
                    className="flex-shrink-0 bg-transparent"
                    style={{ width: `${cornerWidth}px`, height: `${cornerHeight}px` }}
                  />
                  
                  <div className="flex">
                  {currentPuzzle.columnClues.map((clue, colIdx) => {
                      const isCompleted = columnValidation[colIdx] === 'completed'
                      const isHovered = hoveredCell?.col === colIdx
                      // A column with no clue values is an all-zero column (no fills needed)
                      const isEmptyCol = clue.values.length === 0
                      return (
                        <div
                          key={`col-clue-${colIdx}`}
                          className="flex flex-col items-center justify-end"
                          style={{ width: `${cellSize}px`, minHeight: `${cornerHeight}px` }}
                        >
                          {isEmptyCol ? (
                            // Show 0 for empty columns and make its background purple
                            <div
                              className={`flex items-center justify-center border border-[#D0D3DC] dark:border-[#616161] bg-[var(--color-primary)] text-white transition-all duration-150 ${isHovered ? 'ring-2 ring-[#6949FF] ring-offset-1' : ''}`}
                              style={{ width: `${clueSize}px`, height: `${clueSize}px` }}
                            >
                              <span className="font-urbanist font-bold text-white" style={{ fontSize: '11px' }}>0</span>
                            </div>
                          ) : (
                            clue.values.map((value, vIdx) => {
                              // value is used directly — no sentinel mapping needed
                              const bgColor = isCompleted
                                ? 'bg-[#6949FF] dark:bg-[#6949FF]'
                                : isHovered
                                  ? 'bg-[#E8DFFF] dark:bg-[#3D2F7A]'
                                  : 'bg-[#F5F6FA] dark:bg-[#2A2D35]'
                              const textColor = isCompleted
                                ? 'text-white'
                                : 'text-[#2B2F3A] dark:text-[#E0E0E0]'

                              const digitCount = value.toString().length
                              const fontSize = digitCount >= 2
                                ? Math.max(9, Math.min(12, cellSize * 0.45))
                                : Math.max(11, Math.min(14, cellSize * 0.55))

                              return (
                                <div
                                  key={vIdx}
                                  className={`flex items-center justify-center border border-[#D0D3DC] dark:border-[#616161] ${bgColor} transition-all duration-150`}
                                  style={{ width: `${clueSize}px`, height: `${clueSize}px` }}
                                >
                                  <span
                                    className={`font-urbanist font-bold ${textColor}`}
                                    style={{ fontSize: `${fontSize}px` }}
                                  >
                                    {value}
                                  </span>
                                </div>
                              )
                            })
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Bottom: Row Clues + Board */}
                <div className="flex">
                  <div className="flex flex-col flex-shrink-0">
                    {currentPuzzle.rowClues.map((clue, rowIdx) => {
                      const isCompleted = rowValidation[rowIdx] === 'completed'
                      const isHovered = hoveredCell?.row === rowIdx
                      // A row with no clue values is an all-zero row (no fills needed)
                      const isEmptyRow = clue.values.length === 0
                      return (
                        <div
                          key={`row-clue-${rowIdx}`}
                          className="flex items-center justify-end"
                          style={{ minWidth: `${cornerWidth}px`, height: `${cellSize}px` }}
                        >
                          {isEmptyRow ? (
                            // Show 0 for empty rows and make its background purple
                            <div
                              className={`flex items-center justify-center border border-[#D0D3DC] dark:border-[#616161] bg-[var(--color-primary)] text-white transition-all duration-150 ${isHovered ? 'ring-2 ring-[#6949FF] ring-offset-1' : ''}`}
                              style={{ width: `${clueSize}px`, height: `${clueSize}px` }}
                            >
                              <span className="font-urbanist font-bold text-white" style={{ fontSize: '11px' }}>0</span>
                            </div>
                          ) : (
                            clue.values.map((value, vIdx) => {
                              // value is used directly — no sentinel mapping needed
                              const bgColor = isCompleted
                                ? 'bg-[#6949FF] dark:bg-[#6949FF]'
                                : isHovered
                                  ? 'bg-[#E8DFFF] dark:bg-[#3D2F7A]'
                                  : 'bg-[#F5F6FA] dark:bg-[#2A2D35]'
                              const textColor = isCompleted
                                ? 'text-white'
                                : 'text-[#2B2F3A] dark:text-[#E0E0E0]'

                              const digitCount = value.toString().length
                              const fontSize = digitCount >= 2
                                ? Math.max(9, Math.min(12, cellSize * 0.45))
                                : Math.max(11, Math.min(14, cellSize * 0.55))

                              return (
                                <div
                                  key={vIdx}
                                  className={`flex items-center justify-center border border-[#D0D3DC] dark:border-[#616161] ${bgColor} transition-all duration-150`}
                                  style={{ width: `${clueSize}px`, height: `${clueSize}px` }}
                                >
                                  <span
                                    className={`font-urbanist font-bold ${textColor}`}
                                    style={{ fontSize: `${fontSize}px` }}
                                  >
                                    {value}
                                  </span>
                                </div>
                              )
                            })
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <div 
                    className="grid" 
                    style={{
                      gridTemplateColumns: `repeat(${currentPuzzle.size}, ${cellSize}px)`,
                      gridTemplateRows: `repeat(${currentPuzzle.size}, ${cellSize}px)`,
                      touchAction: 'none',
                    }}
                    onPointerUp={handleDragEnd}
                    onPointerLeave={handleDragEnd}
                    onPointerCancel={handleDragEnd}
                  >
                    {grid.map((row, rowIdx) =>
                      row.map((cellState, colIdx) => {
                        const position: CellPosition = { row: rowIdx, col: colIdx }
                        const isSelected = selectedCell?.row === rowIdx && selectedCell?.col === colIdx
                        const isError = errorCell?.row === rowIdx && errorCell?.col === colIdx
                        const cellKey = `${rowIdx}-${colIdx}`
                        const isInDragPreview = dragPreviewCells.has(cellKey) && cellState === 'empty'

                        // Dynamic grey-out of completed rows/columns
                        const isRowCompleted = rowValidation[rowIdx] === 'completed'
                        const isColCompleted = columnValidation[colIdx] === 'completed'
                        const shouldBeGreyed = (isRowCompleted || isColCompleted) && cellState !== 'filled'
                        const isNonClickable = shouldBeGreyed && cellState === 'empty'
                        
                        // Error cells are non-clickable
                        const isErrorCell = cellState === 'error' || isError
                        const isCellNonClickable = isNonClickable || isErrorCell
                        
                        const hasThickRight = (colIdx + 1) % 5 === 0 && colIdx !== currentPuzzle.size - 1
                        const hasThickBottom = (rowIdx + 1) % 5 === 0 && rowIdx !== currentPuzzle.size - 1

                        let bgClass = ''
                        let borderClass = ''
                        
                        if (shouldBeGreyed) {
                          // Visually grey out cells when row/column is complete
                          bgClass = 'bg-[#E8E8E8] dark:bg-[#252830]'
                          borderClass = 'opacity-40'
                        } else if (isInDragPreview) {
                          // Light purple preview during drag
                          bgClass = 'bg-[#A592FF] dark:bg-[#7C6BAE]'
                        } else if (isErrorCell) {
                          bgClass = 'bg-white dark:bg-[#181A20]'
                          borderClass = 'ring-2 ring-red-500 ring-inset'
                        } else if (cellState === 'filled') {
                          bgClass = 'bg-[#000000] dark:bg-[#0A0A0A]'
                        } else if (cellState === 'marked') {
                          bgClass = 'bg-white dark:bg-[#181A20]'
                        } else if (isSelected) {
                          bgClass = 'bg-[#E8DFFF] dark:bg-[#3D2F7A]'
                        } else {
                          bgClass = 'bg-white dark:bg-[#2A2D35] hover:bg-[#E8DFFF] dark:hover:bg-[#35383F]'
                        }

                        return (
                          <button
                            key={`cell-${rowIdx}-${colIdx}`}
                            data-cell-position={`${rowIdx}-${colIdx}`}
                            onClick={(e) => {
                              e.preventDefault()
                              if (!isDragging && !isPinching && !isCellNonClickable) {
                                handleCellClick(position)
                              }
                            }}
                            onPointerDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              if (!isPinching && !isCellNonClickable) {
                                handleDragStart(position)
                              }
                            }}
                            onMouseEnter={() => setHoveredCell(position)}
                            onMouseLeave={() => setHoveredCell(null)}
                            disabled={gameStatus !== 'playing' || isCellNonClickable}
                            className={`group relative flex items-center justify-center border-[1px] border-[#D0D3DC] dark:border-[#616161] ${bgClass} ${borderClass} ${
                              hasThickRight ? 'border-r-[3px] border-r-[#2B2F3A] dark:border-r-[#FAFAFA]' : ''
                            } ${hasThickBottom ? 'border-b-[3px] border-b-[#2B2F3A] dark:border-b-[#FAFAFA]' : ''} ${
                              isCellNonClickable ? 'cursor-not-allowed' : 'cursor-crosshair'
                            } transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#6949FF] disabled:cursor-not-allowed disabled:opacity-70 select-none cell-flip-container`}
                            style={{ 
                              width: `${cellSize}px`, 
                              height: `${cellSize}px`, 
                              touchAction: 'none',
                              transformStyle: 'preserve-3d',
                              perspective: '1000px',
                              pointerEvents: isCellNonClickable ? 'none' : 'auto',
                            }}
                            aria-label={`Cell row ${rowIdx + 1}, column ${colIdx + 1}, ${cellState}`}
                          >
                            {/* Show red flag for marked cells OR when in preview with mark mode */}
                            {((cellState === 'marked' && !isInDragPreview) || (isInDragPreview && inputMode === 'mark')) && (
                              <Flag 
                                size={cellSize * 0.5} 
                                className="pointer-events-none text-[#EF4444]"
                                fill="#EF4444"
                              />
                            )}
                            {/* Show error X for wrong filled cells (permanently visible) */}
                            {isErrorCell && !isInDragPreview && (
                              <svg width={cellSize * 0.5} height={cellSize * 0.5} viewBox="0 0 16 16" fill="none" className="pointer-events-none">
                                <path d="M2 2L14 14M14 2L2 14" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" />
                              </svg>
                            )}
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Custom horizontal scrollbar synced with board scroll (rendered on both mobile and desktop when overflowing) */}
            {isOverflowing && (
              <div className="w-full mt-3 px-[10px]">
                <div className="flex items-center gap-2 max-w-full justify-center">
                  <button
                    onClick={() => {
                      if (boardContainerRef.current) {
                        boardContainerRef.current.scrollLeft -= 50
                      }
                    }}
                    className="lg:hidden w-8 h-8 rounded-full bg-[#E8DFFF] dark:bg-[#3D2F7A] text-[#6949FF] dark:text-[#A592FF] flex items-center justify-center active:scale-95 transition-all duration-200"
                    title="Scroll left"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div
                    ref={scrollbarContainerRef}
                    onScroll={handleScrollbarScroll}
                    className="flex-grow overflow-x-auto board-scroll-container"
                    style={{ 
                      height: '14px',
                      maxWidth: `${cornerWidth + currentPuzzle.size * cellSize}px`
                    }}
                  >
                    <div
                      style={{
                        width: `${cornerWidth + currentPuzzle.size * cellSize}px`,
                        height: '1px',
                      }}
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (boardContainerRef.current) {
                        boardContainerRef.current.scrollLeft += 50
                      }
                    }}
                    className="lg:hidden w-8 h-8 rounded-full bg-[#E8DFFF] dark:bg-[#3D2F7A] text-[#6949FF] dark:text-[#A592FF] flex items-center justify-center active:scale-95 transition-all duration-200"
                    title="Scroll right"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
                <p className="text-center font-urbanist text-[11px] text-[#BDBDBD] dark:text-[#616161] mt-1">
                  ← Scroll to see full board →
                </p>
              </div>
            )}

            {/* Controls */}
            <div 
              className="flex flex-row gap-2 w-full justify-center items-center flex-wrap"
              style={{ 
                maxWidth: `${Math.max(320, cornerWidth + (currentPuzzle.size * cellSize))}px`,
                minWidth: '280px'
              }}
            >
              {/* Hint Button - Icon only */}
              <button
                onClick={useHint}
                disabled={!canUseHint}
                className="w-[46px] h-[46px] rounded-full bg-[#F5F6FA] dark:bg-[#35383F] hover:bg-[#E8DFFF] dark:hover:bg-[#424242] disabled:bg-gray-300 dark:disabled:bg-[#2A2D35] text-[#6949FF] dark:text-[#8B6EFF] disabled:text-gray-400 font-urbanist font-bold transition-all duration-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center relative"
                aria-label={`Use hint, ${maxHints - hintsUsed} remaining`}
                title={`Hint (${maxHints - hintsUsed})`}
              >
                <Lightbulb size={20} />
                {hintsUsed < maxHints && (
                  <span className="absolute -top-1 -right-1 bg-[#6949FF] text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {maxHints - hintsUsed}
                  </span>
                )}
              </button>

              {/* Reset Button */}
              <button
                onClick={resetPuzzle}
                className="flex-1 h-[46px] rounded-full bg-[#E8DFFF] dark:bg-[#3D2F7A] hover:bg-[#D4C5F9] dark:hover:bg-[#4A3A8C] text-[#6949FF] dark:text-white font-urbanist font-bold text-[15px] transition-all duration-200 active:scale-95"
              >
                Reset
              </button>
              
              {/* Action Button - Replay or New Puzzle */}
              {isFromPastPuzzles ? (
                <button
                  onClick={handleReplay}
                  className="flex-1 h-[46px] rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white font-urbanist font-bold text-[15px] transition-all duration-200 active:scale-95"
                >
                  Replay Game
                </button>
              ) : (
                <>
                  <button
                    onClick={handleReplay}
                    className="flex-1 h-[46px] rounded-full bg-[#E8DFFF] dark:bg-[#3D2F7A] hover:bg-[#D4C5F9] dark:hover:bg-[#4A3A8C] text-[#6949FF] dark:text-white font-urbanist font-bold text-[15px] transition-all duration-200 active:scale-95"
                  >
                    Replay
                  </button>
                  <button
                    onClick={handleNewPuzzle}
                    className="flex-1 h-[46px] rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white font-urbanist font-bold text-[15px] transition-all duration-200 active:scale-95"
                  >
                    New Puzzle
                  </button>
                </>
              )}
            </div>

            {/* Keyboard Instructions */}
            <div className="text-center mt-4">
              <p className="font-urbanist text-[12px] text-[#616161] dark:text-[#A0A4B8]">
                <strong>F</strong>: Fill Mode • <strong>M</strong>: Mark Mode • Click/Drag to interact • Arrow keys to navigate • <strong>Space</strong>: Apply mode • Backspace to clear
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Floating Tooltip - Follows Mouse Cursor */}
      {hoveredCell && mousePosition && (
        <div
          className="fixed pointer-events-none transition-none"
          style={{
            left: `${mousePosition.x}px`,
            top: `${mousePosition.y + 20}px`,
            transform: 'translateX(-50%)',
            zIndex: 99999,
          }}
        >
          <div className="bg-[#4A3A8C] dark:bg-[#3D2F7A] rounded-full px-4 py-1.5 shadow-xl border-2 border-[#6949FF] whitespace-nowrap">
            <span className="font-urbanist text-[13px] font-semibold text-white">
              R {hoveredCell.row + 1} | C {hoveredCell.col + 1}
            </span>
          </div>
        </div>
      )}

      {/* Completion & Game Over Modal */}
      <NonogramModal
        isOpen={gameStatus === 'won' || gameStatus === 'lost'}
        difficulty={currentPuzzle.difficulty}
        time={elapsedSeconds}
        completionPercentage={progress.percentComplete}
        hintsUsed={hintsUsed}
        mistakes={mistakeCount}
        maxMistakes={maxMistakes}
        isWin={gameStatus === 'won'}
        onPlayAgain={handleReplay}
        onNewPuzzle={handleNewPuzzle}
        onBackToGames={handleBackToGames}
      />

      {/* Loading Overlay */}
      <GameLoader isOpen={isResetting} text={loaderText} />
    </>
  )
}
