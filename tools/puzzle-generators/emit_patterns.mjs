// Emits the exact CrossMath board patterns from the SAME logic as
// shared/src/data/crossmath/patterns.ts (this is a plain-JS port of
// createPatternCellsAndEquations + boardPatterns, types stripped). Output:
// patterns.json consumed by the Python generator so generated puzzles match
// the app's pattern shapes and operator placement 1:1.
import { writeFileSync } from 'fs'

function createPatternCellsAndEquations(difficulty, type) {
  const size = difficulty === 'easy' ? 7 : 11
  const N = difficulty === 'easy' ? 3 : 5

  const cells = []
  const equations = []

  const addedCells = new Set()
  const addCell = (row, col, cellType, op) => {
    const key = `${row}-${col}`
    if (addedCells.has(key)) return
    addedCells.add(key)
    cells.push({ row, col, type: cellType, operator: op })
  }

  const operatorsPool = ['+', '-']
  let opIdx = 0
  const getNextOp = () => {
    const op = operatorsPool[opIdx % operatorsPool.length]
    opIdx++
    return op
  }

  if (type === 'classic') {
    for (let r = 0; r < N; r++) {
      const rowIdx = r * 2
      const eqCells = []
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
      equations.push({ id: `eq_h_${r}`, direction: 'horizontal', cells: eqCells })
    }
    for (let c = 0; c < N; c++) {
      const colIdx = c * 2
      const eqCells = []
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
      equations.push({ id: `eq_v_${c}`, direction: 'vertical', cells: eqCells })
    }
  } else if (type === 'cross') {
    const centerIdx = N === 3 ? 2 : 4
    const hCells = []
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
    equations.push({ id: 'eq_h_center', direction: 'horizontal', cells: hCells })
    const vCells = []
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
    equations.push({ id: 'eq_v_center', direction: 'vertical', cells: vCells })
  } else if (type === 'snake') {
    const lastNumIdx = size - 1
    const eqIdx = size - 2
    const eq1Cells = []
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
    const eq2Cells = []
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
    const eq3Cells = []
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
    const hCells = []
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
    const vCells = []
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
    const hRows = [0, 4, 8]
    hRows.forEach((r, idx) => {
      if (r >= size) return
      const eqCells = []
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
    const vCols = [0, 8]
    vCols.forEach((c, idx) => {
      if (c >= size) return
      const eqCells = []
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
    const eq1Cells = []
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
    const eq2Cells = []
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
    const eq3Cells = []
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
    const eq4Cells = []
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
    const eq5Cells = []
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

const PATTERNS = [
  { pattern_id: 1, shape_name: 'Easy Classic', difficulty: 'easy', ...createPatternCellsAndEquations('easy', 'classic') },
  { pattern_id: 2, shape_name: 'Easy Cross', difficulty: 'easy', ...createPatternCellsAndEquations('easy', 'cross') },
  { pattern_id: 3, shape_name: 'Easy Snake', difficulty: 'easy', ...createPatternCellsAndEquations('easy', 'snake') },
  { pattern_id: 4, shape_name: 'Easy Diamond', difficulty: 'easy', ...createPatternCellsAndEquations('easy', 'diamond') },
  { pattern_id: 5, shape_name: 'Easy Maze', difficulty: 'easy', ...createPatternCellsAndEquations('easy', 'maze') },
  { pattern_id: 6, shape_name: 'Medium Classic', difficulty: 'medium', ...createPatternCellsAndEquations('medium', 'classic') },
  { pattern_id: 7, shape_name: 'Medium Cross', difficulty: 'medium', ...createPatternCellsAndEquations('medium', 'cross') },
  { pattern_id: 8, shape_name: 'Medium Snake', difficulty: 'medium', ...createPatternCellsAndEquations('medium', 'snake') },
  { pattern_id: 9, shape_name: 'Medium Diamond', difficulty: 'medium', ...createPatternCellsAndEquations('medium', 'diamond') },
  { pattern_id: 10, shape_name: 'Medium Maze', difficulty: 'medium', ...createPatternCellsAndEquations('medium', 'maze') },
  { pattern_id: 11, shape_name: 'Medium Spiral', difficulty: 'medium', ...createPatternCellsAndEquations('medium', 'spiral') },
  { pattern_id: 12, shape_name: 'Hard Classic', difficulty: 'hard', ...createPatternCellsAndEquations('hard', 'classic') },
  { pattern_id: 13, shape_name: 'Hard Cross', difficulty: 'hard', ...createPatternCellsAndEquations('hard', 'cross') },
  { pattern_id: 14, shape_name: 'Hard Snake', difficulty: 'hard', ...createPatternCellsAndEquations('hard', 'snake') },
  { pattern_id: 15, shape_name: 'Hard Diamond', difficulty: 'hard', ...createPatternCellsAndEquations('hard', 'diamond') },
  { pattern_id: 16, shape_name: 'Hard Maze', difficulty: 'hard', ...createPatternCellsAndEquations('hard', 'maze') },
  { pattern_id: 17, shape_name: 'Hard Spiral', difficulty: 'hard', ...createPatternCellsAndEquations('hard', 'spiral') },
]

writeFileSync(
  new URL('./patterns.json', import.meta.url),
  JSON.stringify(PATTERNS, null, 0)
)
console.log('wrote patterns.json with', PATTERNS.length, 'patterns')
