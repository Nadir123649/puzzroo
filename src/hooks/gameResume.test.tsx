import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { SudokuGame } from '@/components/sudoku/SudokuGame'
import { CrossMathGame } from '@/components/crossmath/CrossMathGame'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams('difficulty=easy'),
  usePathname: () => '/sudoku',
}))

const gameApiMock = vi.hoisted(() => ({
  getContinue: vi.fn(),
  getPuzzle: vi.fn(),
  getPuzzleById: vi.fn(),
  getDailyPuzzle: vi.fn(),
  createSession: vi.fn(),
  saveMove: vi.fn(),
  completeSession: vi.fn(),
  abandonSudokuSession: vi.fn(),
  getContinueCrossMath: vi.fn(),
  getContinueDailyCrossMath: vi.fn(),
  createDailyCrossMathSession: vi.fn(),
  abandonCrossMathSession: vi.fn(),
}))
vi.mock('@/lib/api/gameApi', () => ({ gameApi: gameApiMock }))

vi.mock('@/lib/config/firebase-client', () => ({ auth: null }))
vi.mock('firebase/auth', () => ({ signOut: vi.fn() }))

const str = (filled: Array<[number, string]>) => {
  const arr = new Array(81).fill('0')
  filled.forEach(([i, v]) => { arr[i] = v })
  return arr.join('')
}

const toGrid = (s: string): number[][] => {
  const g: number[][] = []
  for (let r = 0; r < 9; r++) {
    const row: number[] = []
    for (let c = 0; c < 9; c++) row.push(Number(s[r * 9 + c]))
    g.push(row)
  }
  return g
}

const toCells = (s: string) =>
  toGrid(s).map(row => row.map(v => ({ value: v || null, fixed: false, notes: [], isCorrect: false, isError: false })))

const PUZZLE_STR = str([[0, '5'], [4, '3'], [8, '7'], [10, '6'], [13, '1'], [18, '2']])
const SOLUTION_STR = str([[0, '5'], [4, '3'], [8, '7'], [10, '6'], [13, '1'], [18, '2'], [20, '4']])
const BOARD_WITH_MOVES = str([[0, '5'], [4, '3'], [8, '7'], [10, '6'], [13, '1'], [18, '2'], [21, '9']])

const sessionWithMoves = (overrides: Record<string, unknown> = {}) => ({
  id: 's1',
  puzzleId: 'p1',
  difficulty: 'easy',
  status: 'playing',
  currentBoard: BOARD_WITH_MOVES,
  elapsedTime: 95,
  hintsUsed: 0,
  mistakes: 0,
  moves: 3,
  score: 0,
  puzzle: { puzzleId: 'p1', difficulty: 'easy', puzzle: toGrid(PUZZLE_STR), solution: toGrid(SOLUTION_STR) },
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  sessionStorage.clear()
})

const sleep = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)))

const formatSudoku = (s: string) => {
  const m = Math.floor(Number(s) / 60).toString().padStart(2, '0')
  const sec = (Number(s) % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

describe('sudoku resume time', () => {
  it('STEP-4: resumes elapsedTime from existing in-progress session via createSession', async () => {
    gameApiMock.getContinue.mockResolvedValue({ hasActiveSession: false })
    gameApiMock.getPuzzle.mockResolvedValue({ id: 'p1', difficulty: 'easy', puzzle: toGrid(PUZZLE_STR), solution: toGrid(SOLUTION_STR) })
    gameApiMock.createSession.mockResolvedValue(sessionWithMoves())

    render(<SudokuGame />)
    await sleep(200)
    await sleep(2000)

    const shown = screen.getAllByText(/0[0-9]:[0-9]{2}/).map((n) => n.textContent)

    expect(shown[0]).toMatch(/01:3[5-9]/)
  })

  it('STEP-3: resumes time from local save by fetching saved puzzle by id', async () => {
    localStorage.setItem(
      `puzzroo_sudoku_game_easy_guest`,
      JSON.stringify({
        version: '1.0',
        currentBoard: toCells(BOARD_WITH_MOVES),
        initialBoard: toCells(PUZZLE_STR),
        solution: toCells(SOLUTION_STR),
        difficulty: 'easy',
        puzzleId: 'p1',
        mistakes: 0,
        score: 0,
        time: 95,
        gameStatus: 'playing',
        savedAt: Date.now(),
      })
    )
    gameApiMock.getContinue.mockResolvedValue({ hasActiveSession: false })
    gameApiMock.getPuzzleById.mockResolvedValue({ id: 'p1', difficulty: 'easy', puzzle: toGrid(PUZZLE_STR), solution: toGrid(SOLUTION_STR) })
    gameApiMock.createSession.mockResolvedValue(sessionWithMoves())

    render(<SudokuGame />)
    await sleep(200)
    await sleep(2000)

    const shown = screen.getAllByText(/0[0-9]:[0-9]{2}/).map((n) => n.textContent)

    expect(shown[0]).toMatch(/01:3[5-9]/)
  })

  it('STEP-1: resumes elapsedTime from /continue active session', async () => {
    gameApiMock.getContinue.mockResolvedValue({ hasActiveSession: true, session: sessionWithMoves() })

    render(<SudokuGame />)
    await sleep(200)
    await sleep(2000)

    const shown = screen.getAllByText(/0[0-9]:[0-9]{2}/).map((n) => n.textContent)

    expect(shown[0]).toMatch(/01:3[5-9]/)
  })

  it('pagehide: flushes exact elapsed time so resume does not rewind', async () => {
    gameApiMock.getContinue.mockResolvedValue({ hasActiveSession: true, session: sessionWithMoves() })

    render(<SudokuGame />)
    await sleep(200)
    await sleep(2000)

    window.dispatchEvent(new Event('pagehide'))

    expect(gameApiMock.saveMove).toHaveBeenCalled()
    const [game, sessionId, payload] = gameApiMock.saveMove.mock.calls.at(-1)
    expect(game).toBe('sudoku')
    expect(sessionId).toBe('s1')
    expect(payload.elapsedTime).toBeGreaterThanOrEqual(96)
  })
})

describe('crossmath resume time', () => {
  const puzzleDoc = {
    id: 'cm1',
    difficulty: 'easy',
    grid: [
      [{ row: 0, col: 0, value: 4, type: 'number', isEditable: false, isCorrect: true, isError: false },
        { row: 0, col: 1, value: undefined, type: 'empty', isEditable: true, isCorrect: false, isError: false },
        { row: 0, col: 2, value: 9, type: 'number', isEditable: false, isCorrect: true, isError: false }],
      [{ row: 1, col: 0, value: undefined, type: 'empty', isEditable: true, isCorrect: false, isError: false },
        { row: 1, col: 1, value: 5, type: 'number', isEditable: false, isCorrect: true, isError: false },
        { row: 1, col: 2, value: undefined, type: 'empty', isEditable: true, isCorrect: false, isError: false }],
    ],
    availableNumbers: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    maxMistakes: 3,
    solution: {},
  }

  it('STEP-4: resumes remaining time from createSession existing session', async () => {
    gameApiMock.getContinueCrossMath.mockResolvedValue({ hasActiveSession: false })
    gameApiMock.getPuzzle.mockResolvedValue(puzzleDoc)
    gameApiMock.createSession.mockResolvedValue({
      sessionId: 'cs1',
      puzzleId: 'cm1',
      difficulty: 'easy',
      status: 'playing',
      grid: { '0-1': 7, '1-2': 2 },
      elapsedTime: 95,
      moves: 2,
      mistakes: 0,
      hintsUsed: 0,
    })

    render(<CrossMathGame />)
    await sleep(200)
    await sleep(2000)

    const shown = screen.getAllByText(/0[0-9]:[0-9]{2}/).map((n) => n.textContent)

    expect(shown[0]).toBe('03:23')
  })

  it('STEP-1: resumes remaining time from /continue active session', async () => {
    gameApiMock.getContinueCrossMath.mockResolvedValue({
      hasActiveSession: true,
      session: {
        sessionId: 'cs1',
        puzzleId: 'cm1',
        difficulty: 'easy',
        sessionStatus: 'playing',
        grid: { '0-1': 7 },
        elapsedTime: 95,
        moves: 1,
        mistakes: 0,
        hintsUsed: 0,
        puzzle: puzzleDoc,
      },
    })

    render(<CrossMathGame />)
    await sleep(200)
    await sleep(2000)

    const shown = screen.getAllByText(/0[0-9]:[0-9]{2}/).map((n) => n.textContent)

    expect(shown[0]).toBe('03:23')
  })

  it('pagehide: flushes exact remaining time so resume does not rewind', async () => {
    gameApiMock.getContinueCrossMath.mockResolvedValue({
      hasActiveSession: true,
      session: {
        sessionId: 'cs1',
        puzzleId: 'cm1',
        difficulty: 'easy',
        sessionStatus: 'playing',
        grid: { '0-1': 7 },
        elapsedTime: 95,
        moves: 1,
        mistakes: 0,
        hintsUsed: 0,
        puzzle: puzzleDoc,
      },
    })

    render(<CrossMathGame />)
    await sleep(200)
    await sleep(2000)

    window.dispatchEvent(new Event('pagehide'))

    expect(gameApiMock.saveMove).toHaveBeenCalled()
    const [game, sessionId, payload] = gameApiMock.saveMove.mock.calls.at(-1)
    expect(game).toBe('crossmath')
    expect(sessionId).toBe('cs1')
    expect(payload.elapsedTime).toBeGreaterThanOrEqual(96)
  })
})
