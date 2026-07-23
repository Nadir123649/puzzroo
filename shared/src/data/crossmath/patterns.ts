import { Cell } from '@shared/lib/crossmath/types'

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

export function patternToGameGrid(pattern: BoardPattern): Cell[][] {
  const grid: Cell[][] = []
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

// ─── Pattern engine ───────────────────────────────────────────────────────────

interface ShapeLayout {
  hRows: number[]
  vCols: number[]
}

const OP_POOL = ['+', '-'] as const

function buildPattern(difficulty: 'easy' | 'medium' | 'hard', shape: ShapeLayout, type: string): {
  cells: PatternCell[]
  equations: PatternEquation[]
} {
  const isLarge = difficulty !== 'easy'
  const gridSize = isLarge ? 11 : 7
  const N = isLarge ? 5 : 3
  const cells: PatternCell[] = []
  const equations: PatternEquation[] = []
  const addedCells = new Set<string>()

  const addCell = (row: number, col: number, cellType: 'NUMBER' | 'OPERATOR' | 'EQUALS' | 'EMPTY', op?: string) => {
    const key = `${row}-${col}`
    if (addedCells.has(key)) return
    addedCells.add(key)
    cells.push({ row, col, type: cellType, operator: op as any })
  }

  let opIdx = 0
  const nextOp = () => {
    const op = OP_POOL[opIdx % OP_POOL.length]
    opIdx++
    return op
  }

  const eqLastIdx = gridSize - 1
  const eqSignIdx = gridSize - 2

  for (const r of shape.hRows) {
    const eqCells: [number, number][] = []
    for (let i = 0; i < N; i++) {
      const col = i * 2
      addCell(r, col, 'NUMBER')
      eqCells.push([r, col])
      if (i < N - 1) {
        const opCol = col + 1
        addCell(r, opCol, 'OPERATOR', nextOp())
        eqCells.push([r, opCol])
      }
    }
    addCell(r, eqSignIdx, 'EQUALS')
    eqCells.push([r, eqSignIdx])
    addCell(r, eqLastIdx, 'NUMBER')
    eqCells.push([r, eqLastIdx])
    equations.push({ id: `${type}_h_${r}`, direction: 'horizontal', cells: eqCells })
  }

  for (const c of shape.vCols) {
    const eqCells: [number, number][] = []
    for (let i = 0; i < N; i++) {
      const row = i * 2
      addCell(row, c, 'NUMBER')
      eqCells.push([row, c])
      if (i < N - 1) {
        const opRow = row + 1
        addCell(opRow, c, 'OPERATOR', nextOp())
        eqCells.push([opRow, c])
      }
    }
    addCell(eqSignIdx, c, 'EQUALS')
    eqCells.push([eqSignIdx, c])
    addCell(eqLastIdx, c, 'NUMBER')
    eqCells.push([eqLastIdx, c])
    equations.push({ id: `${type}_v_${c}`, direction: 'vertical', cells: eqCells })
  }

  return { cells, equations }
}

// ─── Shape definitions ────────────────────────────────────────────────────────

type ShapeFn = (difficulty: 'easy' | 'medium' | 'hard') => ShapeLayout

const SHAPE_DEFS: Record<string, string> = {
  classic: 'Square',
  cross: 'Cross',
  plus: 'Plus',
  snake: 'Snake',
  diamond: 'Diamond',
  maze: 'Maze Layout',
  spiral: 'Spiral',
  'double-cross': 'Double Cross',
  'hollow-square': 'Hollow Square',
  ring: 'Ring',
  'l-shape': 'L Shape',
  't-shape': 'T Shape',
  'u-shape': 'U Shape',
  'h-shape': 'H Shape',
  'v-lines': 'Vertical Lines',
  'h-lines': 'Horizontal Lines',
  'thick-cross': 'Cross',
  'z-shape': 'Z Shape',
  'c-shape': 'C Shape',
  corner: 'Corner',
  'top-row': 'Top Row',
  'bottom-row': 'Bottom Row',
  'center-row': 'Center Row',
  'left-col': 'Left Column',
  'right-col': 'Right Column',
  'center-col': 'Center Column',
  'three-rows': 'Three Rows',
  'three-cols': 'Three Columns',
  'top-half': 'Top Half',
  'bottom-half': 'Bottom Half',
  staircase: 'Staircase',
  pyramid: 'Pyramid',
  hexagon: 'Hexagon-like',
  arrow: 'Arrow',
  lightning: 'Lightning Bolt',
  anchor: 'Anchor',
  'question-mark': 'Question Mark',
  'exclamation': 'Exclamation Mark',
  crown: 'Crown',
  trophy: 'Trophy',
  medal: 'Medal',
  sun: 'Sun',
  star: 'Star',
  heart: 'Heart',
  flower: 'Flower',
  'christmas-tree': 'Christmas Tree',
  snowflake: 'Snowflake',
  'gift-box': 'Gift Box',
  pumpkin: 'Pumpkin',
  egg: 'Easter Egg',
  clover: 'Clover',
  butterfly: 'Butterfly',
  hourglass: 'Hourglass',
  smiley: 'Smiley Face',
  rocket: 'Rocket',
  shield: 'Shield',
  flag: 'Flag',
  sword: 'Sword',
  house: 'House',
  fish: 'Fish',
  cat: 'Cat',
  dog: 'Dog',
  castle: 'Castle',
  boat: 'Boat',
  plane: 'Plane',
  train: 'Train',
  car: 'Car',
  'letter-a': 'Letter A',
  'letter-e': 'Letter E',
  'number-7': 'Number 7',
  'number-8': 'Number 8',
  'crescent-moon': 'Crescent Moon',
  'lock-key': 'Lock and Key',
  key: 'Key',
  skull: 'Skull',
  ghost: 'Ghost',
  bat: 'Bat',
  'witch-hat': 'Witch Hat',
  bunny: 'Bunny Head',
  chick: 'Chick',
  leaf: 'Leaf',
  acorn: 'Acorn',
  snowman: 'Snowman',
  mitten: 'Mitten',
  firework: 'Firework',
  champagne: 'Champagne Glass',
  bell: 'Bell',
  ornament: 'Ornament',
  'candy-cane': 'Candy Cane',
}

const shapeFn: Record<string, ShapeFn> = {}

shapeFn.classic = (d) => {
  const r = d === 'easy' ? [0, 2, 4] : [0, 2, 4, 6, 8]
  return { hRows: r, vCols: r }
}

shapeFn.cross = (d) => {
  const s = d === 'easy' ? 2 : 4
  return { hRows: [s], vCols: [s] }
}

shapeFn.plus = (d) => {
  if (d === 'easy') return { hRows: [0, 2, 4], vCols: [2] }
  return { hRows: [0, 2, 4, 6, 8], vCols: [4] }
}

shapeFn.snake = (d) => {
  if (d === 'easy') return { hRows: [0], vCols: [4] }
  return { hRows: [0], vCols: [8] }
}

shapeFn.diamond = (d) => {
  const s = d === 'easy' ? 2 : 4
  return { hRows: [s], vCols: [s] }
}

shapeFn.maze = (d) => {
  if (d === 'easy') return { hRows: [0, 4], vCols: [0] }
  return { hRows: [0, 4, 8], vCols: [0, 8] }
}

shapeFn.spiral = (d) => {
  if (d === 'easy') return { hRows: [0], vCols: [4] }
  return { hRows: [0, 8, 4], vCols: [8, 0] }
}

shapeFn['double-cross'] = (d) => {
  if (d === 'easy') return { hRows: [0, 4], vCols: [2] }
  return { hRows: [2, 6], vCols: [2, 6] }
}

shapeFn['hollow-square'] = (d) => {
  if (d === 'easy') return { hRows: [0, 4], vCols: [0, 4] }
  return { hRows: [0, 8], vCols: [0, 8] }
}

shapeFn.ring = (d) => {
  if (d === 'easy') return { hRows: [0, 2, 4], vCols: [0, 4] }
  return { hRows: [0, 2, 6, 8], vCols: [0, 8] }
}

shapeFn['l-shape'] = (d) => {
  if (d === 'easy') return { hRows: [4], vCols: [0] }
  return { hRows: [8], vCols: [0] }
}

shapeFn['t-shape'] = (d) => {
  if (d === 'easy') return { hRows: [0, 4], vCols: [2] }
  return { hRows: [0, 8], vCols: [4] }
}

shapeFn['u-shape'] = (d) => {
  if (d === 'easy') return { hRows: [0, 4], vCols: [0] }
  return { hRows: [0, 8], vCols: [0] }
}

shapeFn['h-shape'] = (d) => {
  if (d === 'easy') return { hRows: [2], vCols: [0, 4] }
  return { hRows: [4], vCols: [0, 4, 8] }
}

shapeFn['v-lines'] = (d) => {
  if (d === 'easy') return { hRows: [], vCols: [0, 2, 4] }
  return { hRows: [], vCols: [0, 2, 4, 6, 8] }
}

shapeFn['h-lines'] = (d) => {
  if (d === 'easy') return { hRows: [0, 2, 4], vCols: [] }
  return { hRows: [0, 2, 4, 6, 8], vCols: [] }
}

shapeFn.border = (d) => {
  if (d === 'easy') return { hRows: [0, 4], vCols: [0, 4] }
  return { hRows: [0, 8], vCols: [0, 8] }
}

shapeFn['thick-cross'] = (d) => {
  if (d === 'easy') return { hRows: [2], vCols: [0, 2, 4] }
  return { hRows: [4, 6], vCols: [4, 6] }
}

shapeFn['z-shape'] = (d) => {
  if (d === 'easy') return { hRows: [0, 4], vCols: [4] }
  return { hRows: [0, 8], vCols: [8] }
}

shapeFn['c-shape'] = (d) => {
  if (d === 'easy') return { hRows: [0, 4], vCols: [0] }
  return { hRows: [0, 8], vCols: [0] }
}

shapeFn.corner = (d) => {
  if (d === 'easy') return { hRows: [4], vCols: [4] }
  return { hRows: [8], vCols: [8] }
}

shapeFn['top-row'] = (d) => {
  return { hRows: [0], vCols: [] }
}

shapeFn['bottom-row'] = (d) => {
  const s = d === 'easy' ? 4 : 8
  return { hRows: [s], vCols: [] }
}

shapeFn['center-row'] = (d) => {
  const s = d === 'easy' ? 2 : 4
  return { hRows: [s], vCols: [] }
}

shapeFn['left-col'] = (d) => {
  return { hRows: [], vCols: [0] }
}

shapeFn['right-col'] = (d) => {
  const s = d === 'easy' ? 4 : 8
  return { hRows: [], vCols: [s] }
}

shapeFn['center-col'] = (d) => {
  const s = d === 'easy' ? 2 : 4
  return { hRows: [], vCols: [s] }
}

shapeFn['three-rows'] = (d) => {
  if (d === 'easy') return { hRows: [0, 2, 4], vCols: [] }
  return { hRows: [2, 4, 6], vCols: [] }
}

shapeFn['three-cols'] = (d) => {
  if (d === 'easy') return { hRows: [], vCols: [0, 2, 4] }
  return { hRows: [], vCols: [2, 4, 6] }
}

shapeFn['top-half'] = (d) => {
  if (d === 'easy') return { hRows: [0, 2], vCols: [0, 2] }
  return { hRows: [0, 2, 4], vCols: [0, 2, 4] }
}

shapeFn['bottom-half'] = (d) => {
  if (d === 'easy') return { hRows: [2, 4], vCols: [2, 4] }
  return { hRows: [4, 6, 8], vCols: [4, 6, 8] }
}

shapeFn.staircase = (d) => {
  if (d === 'easy') return { hRows: [0, 2, 4], vCols: [0, 2, 4] }
  return { hRows: [2, 4, 6], vCols: [2, 4, 6] }
}

shapeFn.pyramid = (d) => {
  if (d === 'easy') return { hRows: [0, 2], vCols: [2, 4] }
  return { hRows: [0, 2, 4], vCols: [4, 6, 8] }
}

shapeFn.hexagon = (d) => {
  if (d === 'easy') return { hRows: [0, 2, 4], vCols: [0, 2, 4] }
  return { hRows: [0, 2, 4], vCols: [2, 4, 6] }
}

shapeFn.arrow = (d) => {
  if (d === 'easy') return { hRows: [2], vCols: [4] }
  return { hRows: [4], vCols: [8] }
}

shapeFn.lightning = (d) => {
  if (d === 'easy') return { hRows: [2], vCols: [0, 4] }
  return { hRows: [4], vCols: [2, 8] }
}

shapeFn.anchor = (d) => {
  if (d === 'easy') return { hRows: [0, 2], vCols: [2] }
  return { hRows: [0, 4, 8], vCols: [4] }
}

shapeFn['question-mark'] = (d) => {
  if (d === 'easy') return { hRows: [0, 2, 4], vCols: [2] }
  return { hRows: [0, 2, 4], vCols: [4, 8] }
}

shapeFn.exclamation = (d) => {
  if (d === 'easy') return { hRows: [], vCols: [2] }
  return { hRows: [4], vCols: [4] }
}

shapeFn.crown = (d) => {
  if (d === 'easy') return { hRows: [0, 2, 4], vCols: [0, 4] }
  return { hRows: [0, 2, 4, 6], vCols: [2, 6] }
}

shapeFn.trophy = (d) => {
  if (d === 'easy') return { hRows: [0, 4], vCols: [2] }
  return { hRows: [0, 2, 6], vCols: [4] }
}

shapeFn.medal = (d) => {
  if (d === 'easy') return { hRows: [2], vCols: [0, 4] }
  return { hRows: [2, 6], vCols: [4] }
}

shapeFn.sun = (d) => {
  if (d === 'easy') return { hRows: [0, 2, 4], vCols: [0, 2, 4] }
  return { hRows: [0, 2, 4, 6, 8], vCols: [0, 4, 8] }
}

shapeFn.star = (d) => {
  if (d === 'easy') return { hRows: [2], vCols: [0, 2, 4] }
  return { hRows: [2, 4, 6], vCols: [2, 4, 6] }
}

shapeFn.heart = (d) => {
  if (d === 'easy') return { hRows: [0, 2, 4], vCols: [0, 2, 4] }
  return { hRows: [0, 2, 4, 6, 8], vCols: [2, 4, 6] }
}

shapeFn.flower = (d) => {
  if (d === 'easy') return { hRows: [0, 4], vCols: [0, 4] }
  return { hRows: [0, 4, 8], vCols: [0, 4, 8] }
}

shapeFn['christmas-tree'] = (d) => {
  if (d === 'easy') return { hRows: [0, 2], vCols: [2] }
  return { hRows: [0, 2, 4], vCols: [4] }
}

shapeFn.snowflake = (d) => {
  if (d === 'easy') return { hRows: [0, 2, 4], vCols: [0, 4] }
  return { hRows: [0, 2, 4, 6, 8], vCols: [0, 4, 8] }
}

shapeFn['gift-box'] = (d) => {
  if (d === 'easy') return { hRows: [0, 4], vCols: [0, 4] }
  return { hRows: [0, 4, 8], vCols: [0, 8] }
}

shapeFn.pumpkin = (d) => {
  if (d === 'easy') return { hRows: [0, 4], vCols: [2] }
  return { hRows: [0, 4, 8], vCols: [2, 6] }
}

shapeFn.egg = (d) => {
  if (d === 'easy') return { hRows: [0, 2], vCols: [2] }
  return { hRows: [0, 2, 4], vCols: [4] }
}

shapeFn.clover = (d) => {
  if (d === 'easy') return { hRows: [0, 2, 4], vCols: [0, 4] }
  return { hRows: [0, 2, 4, 6], vCols: [2, 6] }
}

shapeFn.butterfly = (d) => {
  if (d === 'easy') return { hRows: [0, 2, 4], vCols: [0, 2, 4] }
  return { hRows: [0, 2, 6, 8], vCols: [2, 6] }
}

shapeFn.hourglass = (d) => {
  if (d === 'easy') return { hRows: [0, 4], vCols: [2] }
  return { hRows: [0, 8], vCols: [4] }
}

shapeFn.smiley = (d) => {
  if (d === 'easy') return { hRows: [0, 2, 4], vCols: [0, 4] }
  return { hRows: [0, 2, 6, 8], vCols: [0, 8] }
}

shapeFn.rocket = (d) => {
  if (d === 'easy') return { hRows: [0, 4], vCols: [2] }
  return { hRows: [0, 8], vCols: [4] }
}

shapeFn.shield = (d) => {
  if (d === 'easy') return { hRows: [0, 4], vCols: [2] }
  return { hRows: [0, 8], vCols: [4] }
}

shapeFn.flag = (d) => {
  if (d === 'easy') return { hRows: [0], vCols: [0] }
  return { hRows: [0, 2, 4, 6], vCols: [0] }
}

shapeFn.sword = (d) => {
  if (d === 'easy') return { hRows: [], vCols: [2] }
  return { hRows: [4], vCols: [0, 4, 8] }
}

shapeFn.house = (d) => {
  if (d === 'easy') return { hRows: [0, 2, 4], vCols: [2] }
  return { hRows: [0, 2, 8], vCols: [2, 6] }
}

shapeFn.fish = (d) => {
  if (d === 'easy') return { hRows: [2], vCols: [0, 4] }
  return { hRows: [4], vCols: [2, 8] }
}

shapeFn.cat = (d) => {
  if (d === 'easy') return { hRows: [0, 2, 4], vCols: [0, 4] }
  return { hRows: [0, 2, 4, 6, 8], vCols: [2, 4, 6] }
}

shapeFn.dog = (d) => {
  if (d === 'easy') return { hRows: [0, 2, 4], vCols: [0, 2] }
  return { hRows: [0, 2, 4, 6, 8], vCols: [0, 4, 8] }
}

shapeFn.castle = (d) => {
  if (d === 'easy') return { hRows: [0, 2, 4], vCols: [0, 2, 4] }
  return { hRows: [0, 2, 6, 8], vCols: [2, 6] }
}

shapeFn.boat = (d) => {
  if (d === 'easy') return { hRows: [4], vCols: [0, 2, 4] }
  return { hRows: [8], vCols: [0, 4, 8] }
}

shapeFn.plane = (d) => {
  if (d === 'easy') return { hRows: [2], vCols: [0, 4] }
  return { hRows: [4], vCols: [2, 8] }
}

shapeFn.train = (d) => {
  if (d === 'easy') return { hRows: [2], vCols: [0, 4] }
  return { hRows: [2, 6], vCols: [0, 8] }
}

shapeFn.car = (d) => {
  if (d === 'easy') return { hRows: [2], vCols: [0, 4] }
  return { hRows: [4], vCols: [2, 8] }
}

shapeFn['letter-a'] = (d) => {
  if (d === 'easy') return { hRows: [0, 2, 4], vCols: [0, 4] }
  return { hRows: [0, 2, 4], vCols: [0, 8] }
}

shapeFn['letter-e'] = (d) => {
  if (d === 'easy') return { hRows: [0, 2, 4], vCols: [0] }
  return { hRows: [0, 4, 8], vCols: [0, 8] }
}

shapeFn['number-7'] = (d) => {
  if (d === 'easy') return { hRows: [0], vCols: [4] }
  return { hRows: [0], vCols: [8] }
}

shapeFn['number-8'] = (d) => {
  if (d === 'easy') return { hRows: [0, 2, 4], vCols: [0, 4] }
  return { hRows: [0, 4, 8], vCols: [0, 8] }
}

shapeFn['crescent-moon'] = (d) => {
  if (d === 'easy') return { hRows: [0, 2], vCols: [2, 4] }
  return { hRows: [0, 2, 4], vCols: [4, 8] }
}

shapeFn['lock-key'] = (d) => {
  if (d === 'easy') return { hRows: [0, 2], vCols: [2] }
  return { hRows: [0, 2, 6], vCols: [4] }
}

shapeFn.key = (d) => {
  if (d === 'easy') return { hRows: [2], vCols: [0, 2] }
  return { hRows: [4], vCols: [2, 4] }
}

shapeFn.skull = (d) => {
  if (d === 'easy') return { hRows: [0, 2, 4], vCols: [0, 4] }
  return { hRows: [0, 2, 6, 8], vCols: [4] }
}

shapeFn.ghost = (d) => {
  if (d === 'easy') return { hRows: [2], vCols: [0, 4] }
  return { hRows: [4], vCols: [0, 8] }
}

shapeFn.bat = (d) => {
  if (d === 'easy') return { hRows: [0, 4], vCols: [2] }
  return { hRows: [0, 2, 4, 6, 8], vCols: [4] }
}

shapeFn['witch-hat'] = (d) => {
  if (d === 'easy') return { hRows: [0], vCols: [2] }
  return { hRows: [0, 4], vCols: [4] }
}

shapeFn.bunny = (d) => {
  if (d === 'easy') return { hRows: [0, 2, 4], vCols: [2] }
  return { hRows: [0, 2, 4, 6], vCols: [4] }
}

shapeFn.chick = (d) => {
  if (d === 'easy') return { hRows: [0, 2], vCols: [2] }
  return { hRows: [0, 2, 4], vCols: [4] }
}

shapeFn.leaf = (d) => {
  if (d === 'easy') return { hRows: [0, 2, 4], vCols: [2] }
  return { hRows: [0, 2, 4, 6, 8], vCols: [4] }
}

shapeFn.acorn = (d) => {
  if (d === 'easy') return { hRows: [0, 2], vCols: [2] }
  return { hRows: [0, 2, 4], vCols: [4] }
}

shapeFn.snowman = (d) => {
  if (d === 'easy') return { hRows: [0, 2, 4], vCols: [2] }
  return { hRows: [0, 4, 8], vCols: [4] }
}

shapeFn.mitten = (d) => {
  if (d === 'easy') return { hRows: [0, 2], vCols: [0] }
  return { hRows: [0, 2, 4], vCols: [0] }
}

shapeFn.firework = (d) => {
  if (d === 'easy') return { hRows: [0, 4], vCols: [0, 4] }
  return { hRows: [0, 8], vCols: [0, 8] }
}

shapeFn.champagne = (d) => {
  if (d === 'easy') return { hRows: [0], vCols: [2] }
  return { hRows: [0], vCols: [4] }
}

shapeFn.bell = (d) => {
  if (d === 'easy') return { hRows: [0, 2, 4], vCols: [2] }
  return { hRows: [0, 2, 6, 8], vCols: [4] }
}

shapeFn.ornament = (d) => {
  if (d === 'easy') return { hRows: [0, 2], vCols: [2] }
  return { hRows: [0, 4, 8], vCols: [4] }
}

shapeFn['candy-cane'] = (d) => {
  if (d === 'easy') return { hRows: [0, 2], vCols: [4] }
  return { hRows: [0, 2, 4], vCols: [8] }
}

// ─── Build all patterns ───────────────────────────────────────────────────────

const EASY_TYPES = [
  'classic', 'cross', 'plus', 'snake', 'diamond', 'maze',
  'double-cross', 'hollow-square', 'ring', 'l-shape', 't-shape',
  'u-shape', 'h-shape', 'v-lines', 'h-lines', 'border',
  'thick-cross', 'z-shape', 'c-shape', 'corner', 'top-row',
  'bottom-row', 'center-row', 'left-col', 'right-col', 'center-col',
  'three-rows', 'three-cols', 'top-half', 'bottom-half',
  'staircase', 'pyramid', 'hexagon', 'arrow', 'lightning',
  'anchor', 'question-mark', 'exclamation', 'crown', 'trophy', 'medal',
  'sun', 'star', 'heart', 'flower', 'christmas-tree',
  'snowflake', 'gift-box', 'pumpkin', 'egg', 'clover',
  'butterfly', 'hourglass', 'smiley', 'rocket', 'shield',
  'flag', 'sword', 'house', 'fish', 'cat', 'dog', 'castle',
  'boat', 'plane', 'train', 'car', 'letter-a', 'letter-e',
  'number-7', 'number-8', 'crescent-moon', 'lock-key', 'key',
  'skull', 'ghost', 'bat', 'witch-hat', 'bunny', 'chick',
  'leaf', 'acorn', 'snowman', 'mitten', 'firework', 'champagne',
  'bell', 'ornament', 'candy-cane',
]

const MEDIUM_TYPES = [
  'classic', 'cross', 'plus', 'snake', 'diamond', 'maze', 'spiral',
  'double-cross', 'hollow-square', 'ring', 'l-shape', 't-shape',
  'u-shape', 'h-shape', 'v-lines', 'h-lines', 'border',
  'thick-cross', 'z-shape', 'c-shape', 'corner', 'top-row',
  'bottom-row', 'center-row', 'left-col', 'right-col', 'center-col',
  'three-rows', 'three-cols', 'top-half', 'bottom-half',
  'staircase', 'pyramid', 'hexagon', 'arrow', 'lightning',
  'anchor', 'question-mark', 'exclamation', 'crown', 'trophy', 'medal',
  'sun', 'star', 'heart', 'flower', 'christmas-tree',
  'snowflake', 'gift-box', 'pumpkin', 'egg', 'clover',
  'butterfly', 'hourglass', 'smiley', 'rocket', 'shield',
  'flag', 'sword', 'house', 'fish', 'cat', 'dog', 'castle',
  'boat', 'plane', 'train', 'car', 'letter-a', 'letter-e',
  'number-7', 'number-8', 'crescent-moon', 'lock-key', 'key',
  'skull', 'ghost', 'bat', 'witch-hat', 'bunny', 'chick',
  'leaf', 'acorn', 'snowman', 'mitten', 'firework', 'champagne',
  'bell', 'ornament', 'candy-cane',
]

const HARD_TYPES = [
  'classic', 'cross', 'plus', 'snake', 'diamond', 'maze', 'spiral',
  'double-cross', 'hollow-square', 'ring', 'l-shape', 't-shape',
  'u-shape', 'h-shape', 'v-lines', 'h-lines', 'border',
  'thick-cross', 'z-shape', 'c-shape', 'corner', 'top-row',
  'bottom-row', 'center-row', 'left-col', 'right-col', 'center-col',
  'three-rows', 'three-cols', 'top-half', 'bottom-half',
  'staircase', 'pyramid', 'hexagon', 'arrow', 'lightning',
  'anchor', 'question-mark', 'exclamation', 'crown', 'trophy', 'medal',
  'sun', 'star', 'heart', 'flower', 'christmas-tree',
  'snowflake', 'gift-box', 'pumpkin', 'egg', 'clover',
  'butterfly', 'hourglass', 'smiley', 'rocket', 'shield',
  'flag', 'sword', 'house', 'fish', 'cat', 'dog', 'castle',
  'boat', 'plane', 'train', 'car', 'letter-a', 'letter-e',
  'number-7', 'number-8', 'crescent-moon', 'lock-key', 'key',
  'skull', 'ghost', 'bat', 'witch-hat', 'bunny', 'chick',
  'leaf', 'acorn', 'snowman', 'mitten', 'firework', 'champagne',
  'bell', 'ornament', 'candy-cane',
]

function buildAllPatterns(
  difficulty: 'easy' | 'medium' | 'hard',
  typeNames: string[],
  idStart: number
): BoardPattern[] {
  const n = typeNames.length
  const gridSize = difficulty === 'easy' ? 7 : 11
  return typeNames.map((t, i) => {
    const fn = shapeFn[t]
    if (!fn) return null
    const layout = fn(difficulty)
    const { cells, equations } = buildPattern(difficulty, layout, t)
    return {
      pattern_id: idStart + i,
      shape_name: SHAPE_DEFS[t] || t,
      difficulty,
      grid_rows: gridSize,
      grid_cols: gridSize,
      cells,
      equations,
    }
  }).filter(Boolean) as BoardPattern[]
}

export const easyPatterns: BoardPattern[] = buildAllPatterns('easy', EASY_TYPES, 1)
export const mediumPatterns: BoardPattern[] = buildAllPatterns('medium', MEDIUM_TYPES, 1 + EASY_TYPES.length)
export const hardPatterns: BoardPattern[] = buildAllPatterns('hard', HARD_TYPES, 1 + EASY_TYPES.length + MEDIUM_TYPES.length)

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
