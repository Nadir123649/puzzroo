import { Cell } from '@shared/lib/crossmath/types'

/**
 * Board Pattern Type Definition
 * Defines the visual layout of a crossmath board without numbers
 */
export interface BoardPattern {
  pattern_id: number
  shape_name: string
  grid_rows: number
  grid_cols: number
  cells: PatternCell[]
  equations: PatternEquation[]
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface PatternCell {
  row: number
  col: number
  type: 'NUMBER' | 'OPERATOR' | 'EQUALS' | 'EMPTY'
  operator?: '+' | '−' | '×' | '÷' | '-'
}

export interface PatternEquation {
  id: string
  direction: 'horizontal' | 'vertical'
  cells: [number, number][]
}

/**
 * Convert pattern cell to game cell (without number values)
 * Any grid cell NOT explicitly defined as active in the pattern
 * will remain as an empty, non-editable spacer cell (dead cell).
 */
export function patternToGameGrid(pattern: BoardPattern): Cell[][] {
  const grid: Cell[][] = []
  
  // Initialize grid with dead spacer cells (fully transparent in UI)
  for (let r = 0; r < pattern.grid_rows; r++) {
    const row: Cell[] = []
    for (let c = 0; c < pattern.grid_cols; c++) {
      row.push({
        type: 'empty',
        isEditable: false,
        row: r,
        col: c,
      })
    }
    grid.push(row)
  }
  
  // Overlay pattern cells
  for (const pc of pattern.cells) {
    let cell: Cell
    if (pc.type === 'NUMBER') {
      cell = {
        type: 'number',
        isEditable: false,
        row: pc.row,
        col: pc.col,
      }
    } else if (pc.type === 'OPERATOR') {
      cell = {
        type: 'operator',
        value: pc.operator || '+',
        isEditable: false,
        row: pc.row,
        col: pc.col,
      }
    } else if (pc.type === 'EQUALS') {
      cell = {
        type: 'operator',
        value: '=',
        isEditable: false,
        row: pc.row,
        col: pc.col,
      }
    } else {
      cell = {
        type: 'empty',
        isEditable: false,
        row: pc.row,
        col: pc.col,
      }
    }
    grid[pc.row][pc.col] = cell
  }
  
  return grid
}

/**
 * Structural helper to dynamically construct cell and equation mappings for shape designs
 */
function createPatternCellsAndEquations(
  difficulty: 'easy' | 'medium' | 'hard',
  type: 'classic' | 'cross' | 'snake' | 'diamond' | 'maze' | 'spiral'
): { cells: PatternCell[]; equations: PatternEquation[] } {
  const size = difficulty === 'easy' ? 7 : 11
  const N = difficulty === 'easy' ? 3 : 5
  
  const cells: PatternCell[] = []
  const equations: PatternEquation[] = []
  
  const addedCells = new Set<string>()
  const addCell = (row: number, col: number, cellType: 'NUMBER' | 'OPERATOR' | 'EQUALS' | 'EMPTY', op?: string) => {
    const key = `${row}-${col}`
    if (addedCells.has(key)) return
    addedCells.add(key)
    cells.push({ row, col, type: cellType, operator: op as any })
  }
  
  const operatorsPool = ['+', '-']
  let opIdx = 0
  const getNextOp = () => {
    const op = operatorsPool[opIdx % operatorsPool.length]
    opIdx++
    return op
  }

  if (type === 'classic') {
    // Full standard grid
    // Horizontal rows
    for (let r = 0; r < N; r++) {
      const rowIdx = r * 2
      const eqCells: [number, number][] = []
      for (let c = 0; c < N; c++) {
        const colIdx = c * 2
        addCell(rowIdx, colIdx, 'NUMBER')
        eqCells.push([rowIdx, colIdx])
        if (c < N - 1) {
          const opCol = colIdx + 1
          const op = getNextOp()
          addCell(rowIdx, opCol, 'OPERATOR', op)
          eqCells.push([rowIdx, opCol])
        }
      }
      const eqCol = size - 2
      addCell(rowIdx, eqCol, 'EQUALS')
      eqCells.push([rowIdx, eqCol])
      const resCol = size - 1
      addCell(rowIdx, resCol, 'NUMBER')
      eqCells.push([rowIdx, resCol])
      
      equations.push({
        id: `eq_h_${r}`,
        direction: 'horizontal',
        cells: eqCells,
      })
    }
    
    // Vertical columns
    for (let c = 0; c < N; c++) {
      const colIdx = c * 2
      const eqCells: [number, number][] = []
      for (let r = 0; r < N; r++) {
        const rowIdx = r * 2
        addCell(rowIdx, colIdx, 'NUMBER')
        eqCells.push([rowIdx, colIdx])
        if (r < N - 1) {
          const opRow = rowIdx + 1
          const op = getNextOp()
          addCell(opRow, colIdx, 'OPERATOR', op)
          eqCells.push([opRow, colIdx])
        }
      }
      const eqRow = size - 2
      addCell(eqRow, colIdx, 'EQUALS')
      eqCells.push([eqRow, colIdx])
      const resRow = size - 1
      addCell(resRow, colIdx, 'NUMBER')
      eqCells.push([resRow, colIdx])
      
      equations.push({
        id: `eq_v_${c}`,
        direction: 'vertical',
        cells: eqCells,
      })
    }
  } else if (type === 'cross') {
    // Center row and Center col only
    const centerIdx = N === 3 ? 2 : 4
    
    // Horizontal center row
    const hCells: [number, number][] = []
    for (let c = 0; c < N; c++) {
      const colIdx = c * 2
      addCell(centerIdx, colIdx, 'NUMBER')
      hCells.push([centerIdx, colIdx])
      if (c < N - 1) {
        const opCol = colIdx + 1
        const op = getNextOp()
        addCell(centerIdx, opCol, 'OPERATOR', op)
        hCells.push([centerIdx, opCol])
      }
    }
    addCell(centerIdx, size - 2, 'EQUALS')
    hCells.push([centerIdx, size - 2])
    addCell(centerIdx, size - 1, 'NUMBER')
    hCells.push([centerIdx, size - 1])
    
    equations.push({
      id: 'eq_h_center',
      direction: 'horizontal',
      cells: hCells,
    })
    
    // Vertical center column
    const vCells: [number, number][] = []
    for (let r = 0; r < N; r++) {
      const rowIdx = r * 2
      addCell(rowIdx, centerIdx, 'NUMBER')
      vCells.push([rowIdx, centerIdx])
      if (r < N - 1) {
        const opRow = rowIdx + 1
        const op = getNextOp()
        addCell(opRow, centerIdx, 'OPERATOR', op)
        vCells.push([opRow, centerIdx])
      }
    }
    addCell(size - 2, centerIdx, 'EQUALS')
    vCells.push([size - 2, centerIdx])
    addCell(size - 1, centerIdx, 'NUMBER')
    vCells.push([size - 1, centerIdx])
    
    equations.push({
      id: 'eq_v_center',
      direction: 'vertical',
      cells: vCells,
    })
  } else if (type === 'snake') {
    const lastNumIdx = size - 1
    const eqIdx = size - 2

    // Top horizontal
    const eq1Cells: [number, number][] = []
    for (let c = 0; c < N; c++) {
      const colIdx = c * 2
      addCell(0, colIdx, 'NUMBER')
      eq1Cells.push([0, colIdx])
      if (c < N - 1) {
        const opCol = colIdx + 1
        addCell(0, opCol, 'OPERATOR', getNextOp())
        eq1Cells.push([0, opCol])
      }
    }
    addCell(0, eqIdx, 'EQUALS')
    eq1Cells.push([0, eqIdx])
    addCell(0, lastNumIdx, 'NUMBER')
    eq1Cells.push([0, lastNumIdx])
    equations.push({ id: 'eq_snake_top', direction: 'horizontal', cells: eq1Cells })

    // Right vertical
    const eq2Cells: [number, number][] = []
    for (let r = 0; r < N; r++) {
      const rowIdx = r * 2
      addCell(rowIdx, lastNumIdx, 'NUMBER')
      eq2Cells.push([rowIdx, lastNumIdx])
      if (r < N - 1) {
        const opRow = rowIdx + 1
        addCell(opRow, lastNumIdx, 'OPERATOR', getNextOp())
        eq2Cells.push([opRow, lastNumIdx])
      }
    }
    addCell(eqIdx, lastNumIdx, 'EQUALS')
    eq2Cells.push([eqIdx, lastNumIdx])
    addCell(lastNumIdx, lastNumIdx, 'NUMBER')
    eq2Cells.push([lastNumIdx, lastNumIdx])
    equations.push({ id: 'eq_snake_right', direction: 'vertical', cells: eq2Cells })

    // Bottom horizontal (Right to Left)
    const eq3Cells: [number, number][] = []
    for (let c = 0; c < N; c++) {
      const colIdx = lastNumIdx - c * 2
      addCell(lastNumIdx, colIdx, 'NUMBER')
      eq3Cells.push([lastNumIdx, colIdx])
      if (c < N - 1) {
        const opCol = colIdx - 1
        addCell(lastNumIdx, opCol, 'OPERATOR', getNextOp())
        eq3Cells.push([lastNumIdx, opCol])
      }
    }
    addCell(lastNumIdx, 1, 'EQUALS')
    eq3Cells.push([lastNumIdx, 1])
    addCell(lastNumIdx, 0, 'NUMBER')
    eq3Cells.push([lastNumIdx, 0])
    equations.push({ id: 'eq_snake_bottom', direction: 'horizontal', cells: eq3Cells })

  } else if (type === 'diamond') {
    const centerIdx = difficulty === 'easy' ? 2 : 4
    
    // Horizontal center row
    const hCells: [number, number][] = []
    for (let c = 0; c < N; c++) {
      const colIdx = c * 2
      addCell(centerIdx, colIdx, 'NUMBER')
      hCells.push([centerIdx, colIdx])
      if (c < N - 1) {
        const opCol = colIdx + 1
        addCell(centerIdx, opCol, 'OPERATOR', getNextOp())
        hCells.push([centerIdx, opCol])
      }
    }
    addCell(centerIdx, size - 2, 'EQUALS')
    hCells.push([centerIdx, size - 2])
    addCell(centerIdx, size - 1, 'NUMBER')
    hCells.push([centerIdx, size - 1])
    equations.push({ id: 'eq_diamond_h', direction: 'horizontal', cells: hCells })
    
    // Vertical center column
    const vCells: [number, number][] = []
    for (let r = 0; r < N; r++) {
      const rowIdx = r * 2
      addCell(rowIdx, centerIdx, 'NUMBER')
      vCells.push([rowIdx, centerIdx])
      if (r < N - 1) {
        const opRow = rowIdx + 1
        addCell(opRow, centerIdx, 'OPERATOR', getNextOp())
        vCells.push([opRow, centerIdx])
      }
    }
    addCell(size - 2, centerIdx, 'EQUALS')
    vCells.push([size - 2, centerIdx])
    addCell(size - 1, centerIdx, 'NUMBER')
    vCells.push([size - 1, centerIdx])
    equations.push({ id: 'eq_diamond_v', direction: 'vertical', cells: vCells })

  } else if (type === 'maze') {
    // 3 horizontal lines (row 0, 4, 8)
    const hRows = [0, 4, 8]
    hRows.forEach((r, idx) => {
      if (r >= size) return
      const eqCells: [number, number][] = []
      for (let c = 0; c < N; c++) {
        const colIdx = c * 2
        addCell(r, colIdx, 'NUMBER')
        eqCells.push([r, colIdx])
        if (c < N - 1) {
          addCell(r, colIdx + 1, 'OPERATOR', getNextOp())
          eqCells.push([r, colIdx + 1])
        }
      }
      addCell(r, size - 2, 'EQUALS')
      eqCells.push([r, size - 2])
      addCell(r, size - 1, 'NUMBER')
      eqCells.push([r, size - 1])
      equations.push({ id: `eq_maze_h_${idx}`, direction: 'horizontal', cells: eqCells })
    })

    // 2 vertical lines (col 0, 8)
    const vCols = [0, 8]
    vCols.forEach((c, idx) => {
      if (c >= size) return
      const eqCells: [number, number][] = []
      for (let r = 0; r < N; r++) {
        const rowIdx = r * 2
        addCell(rowIdx, c, 'NUMBER')
        eqCells.push([rowIdx, c])
        if (r < N - 1) {
          addCell(rowIdx + 1, c, 'OPERATOR', getNextOp())
          eqCells.push([rowIdx + 1, c])
        }
      }
      addCell(size - 2, c, 'EQUALS')
      eqCells.push([size - 2, c])
      addCell(size - 1, c, 'NUMBER')
      eqCells.push([size - 1, c])
      equations.push({ id: `eq_maze_v_${idx}`, direction: 'vertical', cells: eqCells })
    })
  } else if (type === 'spiral') {
    // Row 0
    const eq1Cells: [number, number][] = []
    for (let c = 0; c < 5; c++) {
      addCell(0, c * 2, 'NUMBER')
      eq1Cells.push([0, c * 2])
      if (c < 4) {
        addCell(0, c * 2 + 1, 'OPERATOR', getNextOp())
        eq1Cells.push([0, c * 2 + 1])
      }
    }
    addCell(0, 9, 'EQUALS')
    eq1Cells.push([0, 9])
    addCell(0, 10, 'NUMBER')
    eq1Cells.push([0, 10])
    equations.push({ id: 'eq1', direction: 'horizontal', cells: eq1Cells })

    // Col 8
    const eq2Cells: [number, number][] = []
    for (let r = 0; r < 5; r++) {
      addCell(r * 2, 8, 'NUMBER')
      eq2Cells.push([r * 2, 8])
      if (r < 4) {
        addCell(r * 2 + 1, 8, 'OPERATOR', getNextOp())
        eq2Cells.push([r * 2 + 1, 8])
      }
    }
    addCell(9, 8, 'EQUALS')
    eq2Cells.push([9, 8])
    addCell(10, 8, 'NUMBER')
    eq2Cells.push([10, 8])
    equations.push({ id: 'eq2', direction: 'vertical', cells: eq2Cells })

    // Row 8
    const eq3Cells: [number, number][] = []
    for (let c = 0; c < 5; c++) {
      addCell(8, c * 2, 'NUMBER')
      eq3Cells.push([8, c * 2])
      if (c < 4) {
        addCell(8, c * 2 + 1, 'OPERATOR', getNextOp())
        eq3Cells.push([8, c * 2 + 1])
      }
    }
    addCell(8, 9, 'EQUALS')
    eq3Cells.push([8, 9])
    addCell(8, 10, 'NUMBER')
    eq3Cells.push([8, 10])
    equations.push({ id: 'eq3', direction: 'horizontal', cells: eq3Cells })

    // Col 0
    const eq4Cells: [number, number][] = []
    for (let r = 1; r < 5; r++) {
      addCell(r * 2, 0, 'NUMBER')
      eq4Cells.push([r * 2, 0])
      if (r < 4) {
        addCell(r * 2 + 1, 0, 'OPERATOR', getNextOp())
        eq4Cells.push([r * 2 + 1, 0])
      }
    }
    addCell(9, 0, 'EQUALS')
    eq4Cells.push([9, 0])
    addCell(10, 0, 'NUMBER')
    eq4Cells.push([10, 0])
    equations.push({ id: 'eq4', direction: 'vertical', cells: eq4Cells })

    // Row 4
    const eq5Cells: [number, number][] = []
    for (let c = 0; c < 4; c++) {
      addCell(4, c * 2, 'NUMBER')
      eq5Cells.push([4, c * 2])
      if (c < 3) {
        addCell(4, c * 2 + 1, 'OPERATOR', getNextOp())
        eq5Cells.push([4, c * 2 + 1])
      }
    }
    addCell(4, 7, 'OPERATOR', getNextOp())
    eq5Cells.push([4, 7])
    addCell(4, 8, 'NUMBER')
    eq5Cells.push([4, 8])
    addCell(4, 9, 'EQUALS')
    eq5Cells.push([4, 9])
    addCell(4, 10, 'NUMBER')
    eq5Cells.push([4, 10])
    equations.push({ id: 'eq5', direction: 'horizontal', cells: eq5Cells })
  }
  
  return { cells, equations }
}

export const easyPatterns: BoardPattern[] = [
  {
    pattern_id: 1,
    shape_name: 'Easy Classic',
    difficulty: 'easy',
    grid_rows: 7,
    grid_cols: 7,
    ...createPatternCellsAndEquations('easy', 'classic'),
  },
  {
    pattern_id: 2,
    shape_name: 'Easy Cross',
    difficulty: 'easy',
    grid_rows: 7,
    grid_cols: 7,
    ...createPatternCellsAndEquations('easy', 'cross'),
  },
  {
    pattern_id: 3,
    shape_name: 'Easy Snake',
    difficulty: 'easy',
    grid_rows: 7,
    grid_cols: 7,
    ...createPatternCellsAndEquations('easy', 'snake'),
  },
  {
    pattern_id: 4,
    shape_name: 'Easy Diamond',
    difficulty: 'easy',
    grid_rows: 7,
    grid_cols: 7,
    ...createPatternCellsAndEquations('easy', 'diamond'),
  },
  {
    pattern_id: 5,
    shape_name: 'Easy Maze',
    difficulty: 'easy',
    grid_rows: 7,
    grid_cols: 7,
    ...createPatternCellsAndEquations('easy', 'maze'),
  },
]

export const mediumPatterns: BoardPattern[] = [
  {
    pattern_id: 6,
    shape_name: 'Medium Classic',
    difficulty: 'medium',
    grid_rows: 11,
    grid_cols: 11,
    ...createPatternCellsAndEquations('medium', 'classic'),
  },
  {
    pattern_id: 7,
    shape_name: 'Medium Cross',
    difficulty: 'medium',
    grid_rows: 11,
    grid_cols: 11,
    ...createPatternCellsAndEquations('medium', 'cross'),
  },
  {
    pattern_id: 8,
    shape_name: 'Medium Snake',
    difficulty: 'medium',
    grid_rows: 11,
    grid_cols: 11,
    ...createPatternCellsAndEquations('medium', 'snake'),
  },
  {
    pattern_id: 9,
    shape_name: 'Medium Diamond',
    difficulty: 'medium',
    grid_rows: 11,
    grid_cols: 11,
    ...createPatternCellsAndEquations('medium', 'diamond'),
  },
  {
    pattern_id: 10,
    shape_name: 'Medium Maze',
    difficulty: 'medium',
    grid_rows: 11,
    grid_cols: 11,
    ...createPatternCellsAndEquations('medium', 'maze'),
  },
  {
    pattern_id: 11,
    shape_name: 'Medium Spiral',
    difficulty: 'medium',
    grid_rows: 11,
    grid_cols: 11,
    ...createPatternCellsAndEquations('medium', 'spiral'),
  },
]

export const hardPatterns: BoardPattern[] = [
  {
    pattern_id: 12,
    shape_name: 'Hard Classic',
    difficulty: 'hard',
    grid_rows: 11,
    grid_cols: 11,
    ...createPatternCellsAndEquations('hard', 'classic'),
  },
  {
    pattern_id: 13,
    shape_name: 'Hard Cross',
    difficulty: 'hard',
    grid_rows: 11,
    grid_cols: 11,
    ...createPatternCellsAndEquations('hard', 'cross'),
  },
  {
    pattern_id: 14,
    shape_name: 'Hard Snake',
    difficulty: 'hard',
    grid_rows: 11,
    grid_cols: 11,
    ...createPatternCellsAndEquations('hard', 'snake'),
  },
  {
    pattern_id: 15,
    shape_name: 'Hard Diamond',
    difficulty: 'hard',
    grid_rows: 11,
    grid_cols: 11,
    ...createPatternCellsAndEquations('hard', 'diamond'),
  },
  {
    pattern_id: 16,
    shape_name: 'Hard Maze',
    difficulty: 'hard',
    grid_rows: 11,
    grid_cols: 11,
    ...createPatternCellsAndEquations('hard', 'maze'),
  },
  {
    pattern_id: 17,
    shape_name: 'Hard Spiral',
    difficulty: 'hard',
    grid_rows: 11,
    grid_cols: 11,
    ...createPatternCellsAndEquations('hard', 'spiral'),
  },
]

export const boardPatterns: BoardPattern[] = [
  ...easyPatterns,
  ...mediumPatterns,
  ...hardPatterns,
]

export function getRandomPatternForDifficulty(
  difficulty: 'easy' | 'medium' | 'hard'
): BoardPattern {
  const pool =
    difficulty === 'easy'
      ? easyPatterns
      : difficulty === 'medium'
      ? mediumPatterns
      : hardPatterns
  return pool[Math.floor(Math.random() * pool.length)]
}

export function getRandomPattern(): BoardPattern {
  return boardPatterns[Math.floor(Math.random() * boardPatterns.length)]
}

export function getPatternById(id: number): BoardPattern | undefined {
  return boardPatterns.find(p => p.pattern_id === id)
}
