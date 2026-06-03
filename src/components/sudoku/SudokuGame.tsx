'use client'

import React from 'react'
import Image from 'next/image'

// Static Sudoku board data matching the Figma design
const sudokuBoard = [
  [2, 0, 0, 3, 0, 0, 6, 0, 0],
  [6, 0, 0, 5, 9, 0, 0, 4, 0],
  [0, 0, 0, 0, 0, 0, 0, 5, 0],
  [4, 0, 0, 9, 0, 0, 6, 3, 0],
  [0, 0, 0, 0, 8, 0, 0, 7, 0],
  [0, 0, 0, 1, 0, 4, 0, 0, 9],
  [1, 0, 0, 6, 2, 7, 0, 0, 0],
  [0, 0, 2, 0, 0, 0, 0, 8, 0],
  [0, 0, 0, 4, 0, 0, 1, 8, 0],
]

// User input cells (shown in different color in mobile dark mode)
const userInputCells = [
  // These will be styled differently
]

// Cells with light purple/pink background highlighting
const highlightedCells = [
  [1, 0], // Row 2, first cell (6)
  [1, 6], // Row 2, 7th cell
  [2, 6], // Row 3, 7th cell
  [6, 0], // Row 7, first cell (1)
  [6, 1], // Row 7, second cell
  [6, 8], // Row 7, last cell
  [8, 0], // Row 9, first cell
]

export function SudokuGame() {
  const isHighlighted = (row: number, col: number) => {
    return highlightedCells.some(([r, c]) => r === row && c === col)
  }

  return (
    <section className="w-full bg-white dark:bg-[#181A20] transition-colors duration-300">
      <div className="w-full px-[clamp(16px,4vw,80px)] flex justify-center">
        <div className="w-full max-w-[717.5px] flex flex-col gap-[30px] pb-0 md:pb-[50px]">
          
          {/* Desktop Layout */}
          <div className="hidden md:flex gap-[30px] justify-center">
            {/* Sudoku Board */}
            <div className="flex-shrink-0">
              <SudokuBoard board={sudokuBoard} isHighlighted={isHighlighted} />
            </div>

            {/* Right Control Panel */}
            <div className="w-[230px] flex flex-col gap-[20px]">
              {/* Stats - Score on top */}
              <div className="text-center">
                <span className="font-urbanist font-semibold text-[24px] leading-[140%] tracking-[0.2px] text-[var(--color-heading)] dark:text-[#E0E0E0]">
                  Score: <span className="text-[var(--color-primary)]">0</span>
                </span>
              </div>
              
              {/* Mistakes and Time */}
              <div className="flex justify-between items-center">
                <span className="font-urbanist font-semibold text-[16px] leading-[140%] tracking-[0.2px] text-[var(--color-heading)] dark:text-[#E0E0E0]">
                  Mistakes: <span className="text-[var(--color-primary)]">0/3</span>
                </span>
                <span className="font-urbanist font-semibold text-[16px] leading-[140%] tracking-[0.2px] text-[var(--color-heading)] dark:text-[#E0E0E0]">
                  Time: <span className="text-[var(--color-primary)]">00:02</span>
                </span>
              </div>

              {/* Feature Buttons */}
              <FeatureButtons />

              {/* Number Pad */}
              <NumberPad />

              {/* New Game Button */}
              <button className="w-full h-[46px] rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-urbanist font-bold text-[16px] transition-all duration-200 active:scale-95 px-4">
                New Game
              </button>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="md:hidden flex flex-col gap-[16px] items-center pb-[50px]">
            {/* Stats Row */}
            <div className="w-full max-w-[350px] flex justify-between items-center px-2">
              <span className="font-urbanist font-semibold text-[18px] leading-[140%] tracking-[0.2px] text-[var(--color-heading)] dark:text-[#E0E0E0]">
                Mistakes: <span className="text-[var(--color-primary)]">0/3</span>
              </span>
              <span className="font-urbanist font-semibold text-[18px] leading-[140%] tracking-[0.2px] text-[var(--color-heading)] dark:text-[#E0E0E0]">
                Score: <span className="text-[var(--color-primary)]">0</span>
              </span>
              <span className="font-urbanist font-semibold text-[18px] leading-[140%] tracking-[0.2px] text-[var(--color-heading)] dark:text-[#E0E0E0]">
                Time: <span className="text-[var(--color-primary)]">00:02</span>
              </span>
            </div>

            {/* Sudoku Board */}
            <SudokuBoard board={sudokuBoard} isHighlighted={isHighlighted} mobile />

            {/* Number Pad Mobile */}
            <NumberPadMobile />

            {/* Feature Buttons Mobile */}
            <FeatureButtonsMobile />

            {/* New Game Button Mobile */}
            <button className="w-full max-w-[350px] h-[46px] rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-urbanist font-bold text-[16px] transition-all duration-200 active:scale-95 px-4">
              New Game
            </button>
          </div>

        </div>
      </div>
    </section>
  )
}

function SudokuBoard({ 
  board, 
  isHighlighted,
  mobile = false 
}: { 
  board: number[][]
  isHighlighted: (row: number, col: number) => boolean
  mobile?: boolean
}) {
  return (
    <div className={`grid grid-cols-9 ${mobile ? 'w-full max-w-[350px]' : 'w-[457.5px]'} aspect-square border-[3.03px] border-[#212121] dark:border-[#FAFAFA]`}>
      {board.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          const isRightBorder = (colIndex + 1) % 3 === 0 && colIndex !== 8
          const isBottomBorder = (rowIndex + 1) % 3 === 0 && rowIndex !== 8
          const hasBackground = isHighlighted(rowIndex, colIndex)

          return (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={`
                flex items-center justify-center
                border-[1.52px] border-[#424242] dark:border-[#FAFAFA]
                font-urbanist font-bold ${mobile ? 'text-[24px]' : 'text-[36.4px]'} leading-[120%] text-[#424242] dark:text-[#F5F5F5]
                ${hasBackground ? 'bg-[#F0EDFF] dark:bg-[#35383F]' : 'bg-transparent'}
                ${isRightBorder ? 'border-r-[3.03px]' : ''}
                ${isBottomBorder ? 'border-b-[3.03px]' : ''}
              `}
            >
              {cell !== 0 ? cell : ''}
            </div>
          )
        })
      )}
    </div>
  )
}

function FeatureButtons() {
  return (
    <div className="w-[230px] h-[50.31px] flex justify-between items-center gap-[8px]">
      {/* Replay/Undo Button */}
      <button className="w-[50.31px] h-[50.31px] rounded-full bg-[#F0EDFF] dark:bg-[#F0EDFF] flex items-center justify-center p-[11.43px] hover:opacity-80 transition-opacity">
        <Image src="/Arrow Counter Clockwise.svg" alt="Replay" width={27} height={27} className="w-[27px] h-[27px]" />
      </button>
      {/* Eraser Button */}
      <button className="w-[50.31px] h-[50.31px] rounded-full bg-[#F0EDFF] dark:bg-[#F0EDFF] flex items-center justify-center p-[11.43px] hover:opacity-80 transition-opacity">
        <Image src="/Eraser.svg" alt="Erase" width={27} height={27} className="w-[27px] h-[27px]" />
      </button>
      {/* Pencil/Edit Button */}
      <button className="w-[50.31px] h-[50.31px] rounded-full bg-[#F0EDFF] dark:bg-[#F0EDFF] flex items-center justify-center p-[11.43px] hover:opacity-80 transition-opacity">
        <Image src="/Edit.svg" alt="Pencil" width={27} height={27} className="w-[27px] h-[27px]" />
      </button>
      {/* Hint/Bulb Button */}
      <button className="relative w-[50.31px] h-[50.31px] rounded-full bg-[#F0EDFF] dark:bg-[#F0EDFF] flex items-center justify-center p-[11.43px] hover:opacity-80 transition-opacity">
        <Image src="/Bulb.svg" alt="Hint" width={27} height={27} className="w-[27px] h-[27px]" />
        {/* Notification Badge */}
        <span className="absolute top-0 right-0 w-[15px] h-[15px] bg-[var(--color-primary)] rounded-full border-2 border-white dark:border-[#181A20]"></span>
      </button>
    </div>
  )
}

function NumberPad() {
  return (
    <div className="grid grid-cols-3 gap-[8.07px] w-[230px]">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
        <button
          key={num}
          className="w-[71.09px] h-[71.09px] rounded-[5.33px] bg-[#F5F5F5] dark:bg-[#1F222A] hover:bg-[#EEEEEE] dark:hover:bg-[#2A2D35] font-urbanist font-bold text-[42.65px] leading-[120%] text-[#424242] dark:text-[#F5F5F5] flex items-center justify-center transition-all duration-200"
        >
          {num}
        </button>
      ))}
    </div>
  )
}

function FeatureButtonsMobile() {
  return (
    <div className="w-full max-w-[350px] flex justify-between items-center px-2">
      {/* Replay/Undo Button */}
      <button className="w-[63.44px] h-[63.44px] rounded-full bg-[#F0EDFF] dark:bg-[#F0EDFF] flex items-center justify-center p-[14.42px] hover:opacity-80 transition-opacity">
        <Image src="/Arrow Counter Clockwise.svg" alt="Replay" width={34} height={34} className="w-[34px] h-[34px]" />
      </button>
      {/* Eraser Button */}
      <button className="w-[63.44px] h-[63.44px] rounded-full bg-[#F0EDFF] dark:bg-[#F0EDFF] flex items-center justify-center p-[14.42px] hover:opacity-80 transition-opacity">
        <Image src="/Eraser.svg" alt="Erase" width={34} height={34} className="w-[34px] h-[34px]" />
      </button>
      {/* Pencil/Edit Button */}
      <button className="w-[63.44px] h-[63.44px] rounded-full bg-[#F0EDFF] dark:bg-[#F0EDFF] flex items-center justify-center p-[14.42px] hover:opacity-80 transition-opacity">
        <Image src="/Edit.svg" alt="Pencil" width={34} height={34} className="w-[34px] h-[34px]" />
      </button>
      {/* Hint/Bulb Button */}
      <button className="relative w-[63.44px] h-[63.44px] rounded-full bg-[#F0EDFF] dark:bg-[#F0EDFF] flex items-center justify-center p-[14.42px] hover:opacity-80 transition-opacity">
        <Image src="/Bulb.svg" alt="Hint" width={34} height={34} className="w-[34px] h-[34px]" />
        {/* Notification Badge */}
        <span className="absolute top-0 right-0 w-[15px] h-[15px] bg-[var(--color-primary)] rounded-full border-2 border-white dark:border-[#181A20]"></span>
      </button>
    </div>
  )
}

function NumberPadMobile() {
  return (
    <div className="flex justify-between items-center gap-[6px] w-full max-w-[350px] px-2">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
        <button
          key={num}
          className="w-[32px] h-[40px] rounded-[2.51px] bg-[#F5F5F5] dark:bg-[#1F222A] hover:bg-[#A592FF] dark:hover:bg-[#A592FF] font-urbanist font-bold text-[18px] leading-[120%] text-[#424242] dark:text-[#F5F5F5] hover:text-white flex items-center justify-center transition-all duration-300"
        >
          {num}
        </button>
      ))}
    </div>
  )
}
