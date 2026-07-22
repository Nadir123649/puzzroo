import { NextRequest } from "next/server";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { getPuzzleById } from "@/lib/server/services/sudoku/puzzleService";
import { sudokuToResponse } from "@/lib/server/puzzles/sudoku";
import { rateLimit } from "@/lib/server/utils/http";
import { cacheHeaders } from "@/lib/server/utils/http";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!rateLimit(_request, "sudoku-puzzle-id", 120)) {
    return errorResponse(429, "rate_limited", "Too many requests");
  }

  try {
    await connectDB();
    const { id } = await params;

    const doc = await getPuzzleById(id);
    if (!doc) return errorResponse(404, "puzzle_not_found", "Puzzle not found");

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
    Object.entries(cacheHeaders(86400)).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  } catch (error: any) {
    console.error("[sudoku/puzzle/id]", error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
