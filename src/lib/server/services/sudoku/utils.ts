const BOARD_SIZE = 9;
const BOX_SIZE = 3;

export function decode81(s: string): number[][] {
  const board: number[][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row: number[] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      row.push(Number(s[r * BOARD_SIZE + c]));
    }
    board.push(row);
  }
  return board;
}

export function encode81(board: number[][]): string {
  let out = "";
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      out += String(board[r]?.[c] ?? 0);
    }
  }
  return out;
}

export function cloneBoard(board: number[][]): number[][] {
  return board.map(row => [...row]);
}

export function createEmptyNotes(): string[][] {
  return Array.from({ length: BOARD_SIZE }, () =>
    Array.from({ length: BOARD_SIZE }, () => "")
  );
}

export function isBoardComplete(board: number[][]): boolean {
  return board.every(row => row.every(cell => cell !== 0));
}

export function hasDuplicates(values: number[]): boolean {
  const seen = new Set<number>();
  for (const v of values) {
    if (v !== 0) {
      if (seen.has(v)) return true;
      seen.add(v);
    }
  }
  return false;
}

export function isValidSudokuRow(board: number[][], row: number): boolean {
  return !hasDuplicates(board[row]);
}

export function isValidSudokuColumn(board: number[][], col: number): boolean {
  const values = board.map(row => row[col]);
  return !hasDuplicates(values);
}

export function isValidSudokuBox(board: number[][], row: number, col: number): boolean {
  const values: number[] = [];
  const startRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
  const startCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
  for (let r = startRow; r < startRow + BOX_SIZE; r++) {
    for (let c = startCol; c < startCol + BOX_SIZE; c++) {
      values.push(board[r][c]);
    }
  }
  return !hasDuplicates(values);
}

export function isValidSudokuBoard(board: number[][]): boolean {
  for (let i = 0; i < BOARD_SIZE; i++) {
    if (!isValidSudokuRow(board, i)) return false;
    if (!isValidSudokuColumn(board, i)) return false;
  }
  for (let r = 0; r < BOARD_SIZE; r += BOX_SIZE) {
    for (let c = 0; c < BOARD_SIZE; c += BOX_SIZE) {
      if (!isValidSudokuBox(board, r, c)) return false;
    }
  }
  return true;
}

export function isBoardFullyValid(board: number[][]): boolean {
  if (!isBoardComplete(board)) return false;
  return isValidSudokuBoard(board);
}

export function countEmptyCells(board: number[][]): number {
  return board.reduce((total, row) =>
    total + row.reduce((sum, cell) => sum + (cell === 0 ? 1 : 0), 0), 0
  );
}

export function boardToString(board: number[][]): string {
  return board.map(row => row.join("")).join("");
}

export function stringToBoard(s: string): number[][] {
  const board: number[][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row: number[] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      row.push(Number(s[r * BOARD_SIZE + c]));
    }
    board.push(row);
  }
  return board;
}

export function calculateScore(
  difficulty: Difficulty,
  timeSeconds: number,
  hintsUsed: number,
  mistakesCount: number
): number {
  const difficultyMultiplier: Record<string, number> = {
    easy: 1,
    medium: 1.5,
    hard: 2,
    expert: 3,
  };

  const targetTime: Record<string, number> = {
    easy: 300,
    medium: 600,
    hard: 900,
    expert: 1200,
  };

  const baseScore = 1000;
  const multiplier = difficultyMultiplier[difficulty] ?? 1;
  const target = targetTime[difficulty] ?? 600;
  const timeBonus = Math.max(0, (target - timeSeconds) * 10);
  const flawlessBonus = (mistakesCount === 0 && hintsUsed === 0) ? 500 : 0;
  const mistakePenalty = mistakesCount * 50;
  const hintPenalty = hintsUsed * 100;

  const score = (baseScore * multiplier) + timeBonus + flawlessBonus - mistakePenalty - hintPenalty;
  return Math.max(100, score);
}

type Difficulty = "easy" | "medium" | "hard" | "expert";
