'use client'

import { Clue, GridSize } from '@shared/lib/nonogram/types'
import { COLORS, GRID_CONFIG } from '@shared/lib/nonogram/constants'

interface NonogramCluesProps {
  rowClues: Clue[]
  columnClues: Clue[]
  size: GridSize
  mobile?: boolean
}

export function NonogramClues({
  rowClues,
  columnClues,
  size,
  mobile = false,
}: NonogramCluesProps) {
  const cellSize = mobile ? GRID_CONFIG.cellSizeMobile : GRID_CONFIG.cellSize

  return (
    <div className="flex gap-2">
      {/* Column Clues (Top) */}
      <div className="flex flex-col items-end">
        {/* Empty corner space */}
        <div
          style={{
            width: `${Math.max(...rowClues.map(c => c.values.length)) * 20}px`,
            height: `${Math.max(...columnClues.map(c => c.values.length)) * 18}px`,
          }}
        />
        
        {/* Row clues */}
        <div className="flex flex-col gap-0">
          {rowClues.map((clue, index) => (
            <div
              key={`row-${index}`}
              className="flex items-center justify-end gap-1 pr-2"
              style={{ height: `${cellSize}px` }}
            >
              {clue.values.map((value, vIndex) => (
                <span
                  key={vIndex}
                  className="font-urbanist text-sm font-semibold text-[#2B2F3A]"
                >
                  {value}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Grid and Column Clues */}
      <div className="flex flex-col">
        {/* Column Clues */}
        <div
          className="flex gap-0 pb-2"
          style={{
            width: `${size * cellSize}px`,
          }}
        >
          {columnClues.map((clue, index) => (
            <div
              key={`col-${index}`}
              className="flex flex-col items-center justify-end gap-0.5"
              style={{ width: `${cellSize}px` }}
            >
              {clue.values.map((value, vIndex) => (
                <span
                  key={vIndex}
                  className="font-urbanist text-sm font-semibold text-[#2B2F3A]"
                >
                  {value}
                </span>
              ))}
            </div>
          ))}
        </div>

        {/* Grid will be placed here by parent */}
        <div className="nonogram-grid-placeholder" />
      </div>
    </div>
  )
}
