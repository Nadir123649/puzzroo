import { NextRequest } from "next/server";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { validate } from "@/lib/server/middleware/validate";
import { randomPuzzleQuerySchema } from "@/lib/server/validators/sudokuValidator";
import { getRandomPuzzle } from "@/lib/server/services/sudoku/puzzleService";
import { sudokuToResponse } from "@/lib/server/puzzles/sudoku";
import { rateLimit } from "@/lib/server/utils/http";
import { auth } from "@/lib/server/middleware/auth";
import { cacheHeaders } from "@/lib/server/utils/http";

export async function GET(
  request: NextRequest,
  _context?: any
) {
  if (!rateLimit(request, "sudoku-puzzle", 120)) {
    return errorResponse(429, "rate_limited", "Too many requests");
  }

  const q = validate(randomPuzzleQuerySchema, Object.fromEntries(new URL(request.url).searchParams));
  if (q.error) return q.error;

  try {
    await connectDB();
    const { difficulty } = q.data;

    const userResult = await auth(request);
    const userId = "error" in userResult ? undefined : userResult.user.id;

    const doc = await getRandomPuzzle(userId, difficulty);
    if (!doc) return errorResponse(404, "no_puzzle", "No puzzle available");

    const response = sudokuToResponse({
      puzzleId: doc.puzzleId,
      difficulty: doc.difficulty,
      puzzle: doc.puzzle,
      solution: doc.solution,
      givens: doc.givens,
      tier: doc.tier,
      techniques: doc.techniques,
    });

    const res = successResponse(response);
    Object.entries(cacheHeaders(30)).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  } catch (error: any) {
    console.error("[sudoku/puzzle]", error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
