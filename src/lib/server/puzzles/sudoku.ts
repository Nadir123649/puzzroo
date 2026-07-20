import type { SudokuPuzzleResponse } from "./types";

/** Decode an 81-char string (0 = empty) into a 9x9 number grid. */
export function decode81(s: string): number[][] {
  const board: number[][] = [];
  for (let r = 0; r < 9; r++) {
    const row: number[] = [];
    for (let c = 0; c < 9; c++) {
      row.push(Number(s[r * 9 + c]));
    }
    board.push(row);
  }
  return board;
}

/** Encode a 9x9 number grid into an 81-char string for compact storage. */
export function encode81(board: number[][]): string {
  let out = "";
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      out += String(board[r][c] ?? 0);
    }
  }
  return out;
}

interface SudokuDoc {
  puzzleId: string;
  difficulty: SudokuPuzzleResponse["difficulty"];
  puzzle: string;
  solution: string;
  givens?: number;
  tier?: number;
  techniques?: string[];
}

export function sudokuToResponse(doc: SudokuDoc): SudokuPuzzleResponse {
  return {
    id: doc.puzzleId,
    difficulty: doc.difficulty,
    puzzle: decode81(doc.puzzle),
    solution: decode81(doc.solution),
    givens: doc.givens,
    tier: doc.tier,
    techniques: doc.techniques,
    size: 9,
  };
}
