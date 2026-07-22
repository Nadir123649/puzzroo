import { decode81, encode81, isBoardComplete, isBoardFullyValid } from "./utils";
import type { Difficulty } from "./types";
import PlaySession from "@/lib/server/models/sudoku/PlaySession";
import SudokuPuzzle from "@/lib/server/models/SudokuPuzzle";
import { connectDB } from "@/lib/server/db";

export async function verifyMove(
  sessionId: string,
  userId: string,
  row: number,
  col: number,
  value: number
) {
  await connectDB();
  const session = await PlaySession.findOne({ _id: sessionId, userId }).lean();
  if (!session) return { error: "session_not_found" };
  if (session.status !== "playing") return { error: "session_not_active" };

  const puzzle = await SudokuPuzzle.findById(session.puzzleId).lean();
  if (!puzzle) return { error: "puzzle_not_found" };

  const solution = decode81(puzzle.solution);
  const expected = solution[row][col];

  if (value !== expected) {
    return {
      correct: false,
      expected,
      received: value,
    };
  }

  return { correct: true };
}

export async function verifyCompletion(board81: string, solution81: string) {
  const board = decode81(board81);
  const solution = decode81(solution81);

  if (!isBoardComplete(board)) {
    return { valid: false, error: "board_incomplete" };
  }

  if (!isBoardFullyValid(board)) {
    return { valid: false, error: "board_invalid" };
  }

  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (board[r][c] !== solution[r][c]) {
        return { valid: false, error: "solution_mismatch" };
      }
    }
  }

  return { valid: true };
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
