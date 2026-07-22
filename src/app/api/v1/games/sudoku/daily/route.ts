import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { validate } from "@/lib/server/middleware/validate";
import { dailyPuzzleQuerySchema } from "@/lib/server/validators/sudokuValidator";
import { getDailyPuzzle } from "@/lib/server/services/sudoku/puzzleService";
import { sudokuToResponse } from "@/lib/server/puzzles/sudoku";
import { rateLimit, cacheHeaders } from "@/lib/server/utils/http";

export async function GET(request: NextRequest) {
  if (!rateLimit(request, "sudoku-daily", 120)) {
    return errorResponse(429, "rate_limited", "Too many requests");
  }

  const q = validate(dailyPuzzleQuerySchema, Object.fromEntries(new URL(request.url).searchParams));
  if (q.error) return q.error;

  try {
    const result = await getDailyPuzzle(q.data.date);
    if (!result) return errorResponse(404, "no_daily_puzzle", "No daily puzzle available");

    const { puzzle, dailyChallenge } = result;

    const response = sudokuToResponse({
      puzzleId: puzzle.puzzleId,
      difficulty: puzzle.difficulty,
      puzzle: puzzle.puzzle,
      solution: puzzle.solution,
      givens: puzzle.givens,
      tier: puzzle.tier,
      techniques: puzzle.techniques,
    });

    const res = successResponse({
      ...(response as any),
      date: dailyChallenge.date,
      playerCount: dailyChallenge.playerCount,
    });
    Object.entries(cacheHeaders(86400)).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  } catch (error: any) {
    console.error("[sudoku/daily]", error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
