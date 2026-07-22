import { NextRequest } from "next/server";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { validate } from "@/lib/server/middleware/validate";
import { listPuzzlesQuerySchema } from "@/lib/server/validators/puzzleValidator";
import { getPuzzlesByDifficulty, getCatalogSummary } from "@/lib/server/services/sudoku/puzzleService";
import { sudokuToResponse } from "@/lib/server/puzzles/sudoku";
import { rateLimit } from "@/lib/server/utils/http";

export async function GET(
  request: NextRequest,
  _context?: any
) {
  if (!rateLimit(request, "sudoku-puzzles", 120)) {
    return errorResponse(429, "rate_limited", "Too many requests");
  }

  const q = validate(listPuzzlesQuerySchema, Object.fromEntries(new URL(request.url).searchParams));
  if (q.error) return q.error;

  try {
    await connectDB();

    if (!q.data.difficulty) {
      const summary = await getCatalogSummary();
      return successResponse(summary);
    }

    const docs = await getPuzzlesByDifficulty(q.data.difficulty as any, q.data.cursor, q.data.limit);

    const puzzles = docs.map(doc =>
      sudokuToResponse({
        puzzleId: doc.puzzleId,
        difficulty: doc.difficulty,
        puzzle: doc.puzzle,
        solution: doc.solution,
        givens: doc.givens,
        tier: doc.tier,
        techniques: doc.techniques,
      })
    );

    return successResponse({
      puzzles,
      cursor: puzzles.length === q.data.limit ? String(docs[docs.length - 1]._id) : null,
    });
  } catch (error: any) {
    console.error("[sudoku/puzzles]", error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
