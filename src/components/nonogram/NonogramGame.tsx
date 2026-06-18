'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Lightbulb, Flag } from 'lucide-react'
import { useNonogram } from '@/hooks/useNonogram'
import { NonogramModal } from './NonogramModal'
import { InputModeToolbar } from '@/components/games/nonogram/InputModeToolbar'
import { formatTime } from '@/lib/nonogram/helpers'
import type { CellPosition } from '@/lib/nonogram/types'

export function NonogramGame() {
  const router = useRouter()
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
  } = useNonogram()

  const [windowWidth, setWindowWidth] = useState(0)
  const [zoomLevel, setZoomLevel] = useState(1) // 1 = 100%, 0.6 = 60%, 1.5 = 150%
  const [isPinching, setIsPinching] = useState(false)
  const initialPinchDistance = useRef<number>(0)
  const initialZoomLevel = useRef<number>(1)

  useEffect(() => {
    const updateWidth = () => setWindowWidth(window.innerWidth)
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

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
    router.push('/#free-games')
  }

  if (!isInitialized || !currentPuzzle) {
    return (
      <section className="w-full bg-white dark:bg-[#181A20] min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="font-urbanist text-lg text-[#2B2F3A] dark:text-white">
            Loading puzzle...
          </p>
        </div>
      </section>
    )
  }

  const maxRowClueCount = Math.max(...currentPuzzle.rowClues.map(c => c.values.length), 1)
  const maxColClueCount = Math.max(...currentPuzzle.columnClues.map(c => c.values.length), 1)
  
  // Clue size should also scale with zoom
  const clueSize = cellSize
  const cornerWidth = maxRowClueCount * clueSize
  const cornerHeight = maxColClueCount * clueSize

  const canUseHint = hintsUsed < maxHints && gameStatus === 'playing'

  return (
    <>
      <section className="w-full bg-white dark:bg-[#181A20] transition-colors duration-300 overflow-x-hidden">
        <div className="w-full px-[20px] py-[40px] flex justify-center overflow-x-hidden">
          <div className="w-full max-w-[717.5px] flex flex-col items-center gap-[20px] overflow-x-hidden">
            
            {/* Timer and Progress Bar */}
            <div className="w-full flex flex-col gap-3">
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
            <div className="flex items-center justify-center gap-2">
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
            </div>

            {/* Input Mode Toolbar */}
            <InputModeToolbar
              activeMode={inputMode}
              onModeChange={setInputMode}
              disabled={gameStatus !== 'playing'}
              maxWidth={cornerWidth + (currentPuzzle.size * cellSize)}
            />

            {/* Game Board */}
            <div className="w-full flex justify-center overflow-x-auto">
              <div className="inline-flex flex-col border-2 border-[#D0D3DC] dark:border-[#616161]" style={{ maxWidth: '100%' }}>
                
                {/* Top: Corner + Column Clues */}
                <div className="flex">
                  <div 
                    className="flex-shrink-0 bg-transparent"
                    style={{ width: `${cornerWidth}px`, height: `${cornerHeight}px` }}
                  />
                  
                  <div className="flex">
                    {currentPuzzle.columnClues.map((clue, colIdx) => {
                      const isCompleted = columnValidation[colIdx] === 'completed'
                      return (
                        <div
                          key={`col-clue-${colIdx}`}
                          className="flex flex-col items-center justify-end"
                          style={{ width: `${cellSize}px`, minHeight: `${cornerHeight}px` }}
                        >
                          {clue.values.map((value, vIdx) => {
                            const displayValue = value === 6 ? 0 : value
                            const bgColor = displayValue === 0 
                              ? 'bg-[#6949FF]' 
                              : isCompleted 
                                ? 'bg-[#2F6FED] dark:bg-[#2F6FED]'
                                : 'bg-[#F5F6FA] dark:bg-[#2A2D35]'
                            const textColor = displayValue === 0 || isCompleted
                              ? 'text-white'
                              : 'text-[#2B2F3A] dark:text-[#E0E0E0]'
                            
                            // Responsive font size based on digit count and cell size
                            const digitCount = displayValue.toString().length
                            const fontSize = digitCount >= 2 
                              ? Math.max(9, Math.min(12, cellSize * 0.45))
                              : Math.max(11, Math.min(14, cellSize * 0.55))
                            
                            return (
                              <div
                                key={vIdx}
                                className={`flex items-center justify-center border border-[#D0D3DC] dark:border-[#616161] ${bgColor} transition-colors duration-300`}
                                style={{ width: `${clueSize}px`, height: `${clueSize}px` }}
                              >
                                <span 
                                  className={`font-urbanist font-bold ${textColor}`}
                                  style={{ fontSize: `${fontSize}px` }}
                                >
                                  {displayValue}
                                </span>
                              </div>
                            )
                          })}
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
                      return (
                        <div
                          key={`row-clue-${rowIdx}`}
                          className="flex items-center justify-end"
                          style={{ minWidth: `${cornerWidth}px`, height: `${cellSize}px` }}
                        >
                          {clue.values.map((value, vIdx) => {
                            const displayValue = value === 6 ? 0 : value
                            const bgColor = displayValue === 0 
                              ? 'bg-[#6949FF]' 
                              : isCompleted 
                                ? 'bg-[#2F6FED] dark:bg-[#2F6FED]'
                                : 'bg-[#F5F6FA] dark:bg-[#2A2D35]'
                            const textColor = displayValue === 0 || isCompleted
                              ? 'text-white'
                              : 'text-[#2B2F3A] dark:text-[#E0E0E0]'
                            
                            // Responsive font size based on digit count and cell size
                            const digitCount = displayValue.toString().length
                            const fontSize = digitCount >= 2 
                              ? Math.max(9, Math.min(12, cellSize * 0.45))
                              : Math.max(11, Math.min(14, cellSize * 0.55))
                            
                            return (
                              <div
                                key={vIdx}
                                className={`flex items-center justify-center border border-[#D0D3DC] dark:border-[#616161] ${bgColor} transition-colors duration-300`}
                                style={{ width: `${clueSize}px`, height: `${clueSize}px` }}
                              >
                                <span 
                                  className={`font-urbanist font-bold ${textColor}`}
                                  style={{ fontSize: `${fontSize}px` }}
                                >
                                  {displayValue}
                                </span>
                              </div>
                            )
                          })}
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
                        
                        // Check if this row and column are both completed
                        const isRowCompleted = rowValidation[rowIdx] === 'completed'
                        const isColCompleted = columnValidation[colIdx] === 'completed'
                        const shouldBeEmpty = currentPuzzle.solution[rowIdx][colIdx] === 0
                        const showCompletedEmpty = (isRowCompleted || isColCompleted) && shouldBeEmpty && cellState === 'empty'
                        
                        const hasThickRight = (colIdx + 1) % 5 === 0 && colIdx !== currentPuzzle.size - 1
                        const hasThickBottom = (rowIdx + 1) % 5 === 0 && rowIdx !== currentPuzzle.size - 1

                        let bgClass = ''
                        let borderClass = ''
                        
                        if (isInDragPreview) {
                          // Light purple preview during drag
                          bgClass = 'bg-[#A592FF] dark:bg-[#7C6BAE]'
                        } else if (isError || cellState === 'error') {
                          bgClass = 'bg-white dark:bg-[#181A20]'
                          borderClass = 'ring-2 ring-red-500 ring-inset'
                        } else if (cellState === 'filled') {
                          bgClass = 'bg-[#000000] dark:bg-[#0A0A0A]'
                        } else if (cellState === 'marked') {
                          bgClass = 'bg-white dark:bg-[#181A20]'
                        } else if (showCompletedEmpty) {
                          // Light gray for empty cells in completed rows/columns
                          bgClass = 'bg-[#E8E8E8] dark:bg-[#2A2D35]'
                        } else if (isSelected) {
                          bgClass = 'bg-[#E8DFFF] dark:bg-[#3D2F7A]'
                        } else {
                          bgClass = 'bg-white dark:bg-[#181A20] hover:bg-[#F5F6FA] dark:hover:bg-[#35383F]'
                        }

                        return (
                          <button
                            key={`cell-${rowIdx}-${colIdx}`}
                            data-cell-position={`${rowIdx}-${colIdx}`}
                            onClick={(e) => {
                              e.preventDefault()
                              if (!isDragging && !isPinching) {
                                handleCellClick(position)
                              }
                            }}
                            onPointerDown={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              if (!isPinching) {
                                handleDragStart(position)
                              }
                            }}
                            disabled={gameStatus !== 'playing'}
                            className={`flex items-center justify-center border-[1px] border-[#D0D3DC] dark:border-[#616161] ${bgClass} ${borderClass} ${
                              hasThickRight ? 'border-r-[3px] border-r-[#2B2F3A] dark:border-r-[#FAFAFA]' : ''
                            } ${hasThickBottom ? 'border-b-[3px] border-b-[#2B2F3A] dark:border-b-[#FAFAFA]' : ''} transition-colors duration-150 cursor-crosshair focus:outline-none focus:ring-2 focus:ring-[#6949FF] disabled:cursor-not-allowed disabled:opacity-70 select-none cell-flip-container`}
                            style={{ 
                              width: `${cellSize}px`, 
                              height: `${cellSize}px`, 
                              touchAction: 'none',
                              transformStyle: 'preserve-3d',
                              perspective: '1000px',
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
                            {/* Show error X */}
                            {(cellState === 'error' || isError) && !isInDragPreview && (
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

              {/* AutoFill Button - For Testing */}
              <button
                onClick={autoFill}
                className="px-3 h-[46px] rounded-full bg-[#22C55E] hover:bg-[#16A34A] text-white font-urbanist font-bold text-[13px] transition-all duration-200 active:scale-95"
                title="Auto-fill solution (testing)"
              >
                Auto
              </button>
              
              {/* Reset Button */}
              <button
                onClick={resetPuzzle}
                className="flex-1 h-[46px] rounded-full bg-[#E8DFFF] dark:bg-[#3D2F7A] hover:bg-[#D4C5F9] dark:hover:bg-[#4A3A8C] text-[#6949FF] dark:text-white font-urbanist font-bold text-[15px] transition-all duration-200 active:scale-95"
              >
                Reset
              </button>
              
              {/* New Puzzle Button */}
              <button
                onClick={newPuzzle}
                className="flex-1 h-[46px] rounded-full bg-[#6949FF] hover:bg-[#5536E6] text-white font-urbanist font-bold text-[15px] transition-all duration-200 active:scale-95"
              >
                New Puzzle
              </button>
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

      {/* Completion Modal */}
      <NonogramModal
        isOpen={gameStatus === 'won'}
        difficulty={currentPuzzle.difficulty}
        time={elapsedSeconds}
        completionPercentage={progress.percentComplete}
        hintsUsed={hintsUsed}
        onPlayAgain={resetPuzzle}
        onNewPuzzle={newPuzzle}
        onBackToGames={handleBackToGames}
      />
    </>
  )
}
