import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { validate } from "@/lib/server/middleware/validate";
import { completeSessionSchema } from "@/lib/server/validators/sudokuValidator";
import { completeSession, getSession } from "@/lib/server/services/sudoku/sessionService";
import { verifyCompletion, calculateScore } from "@/lib/server/services/sudoku/verificationService";
import {
  updateUserStatsOnComplete,
  updatePuzzleStatsOnComplete,
} from "@/lib/server/services/sudoku/statisticsService";
import SudokuPuzzle from "@/lib/server/models/SudokuPuzzle";
import { auth } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/db";
import { rateLimit } from "@/lib/server/utils/http";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!rateLimit(request, "sudoku-complete", 30)) {
    return errorResponse(429, "rate_limited", "Too many requests");
  }

  const userResult = await auth(request);
  if ("error" in userResult) return userResult.error;

  let body: any = {};
  try { body = await request.json(); } catch {}

  const val = validate(completeSessionSchema, body);
  if (val.error) return val.error;

  try {
    const { id } = await params;
    const session = await getSession(id, userResult.user.id);
    if (!session) return errorResponse(404, "session_not_found", "Session not found");
    if (session.status !== "playing") {
      return errorResponse(400, "session_not_active", "Session is already completed or abandoned");
    }

    await connectDB();
    const puzzle = await SudokuPuzzle.findById(session.puzzleId).lean();
    if (!puzzle) return errorResponse(404, "puzzle_not_found", "Puzzle not found");

    const verification = await verifyCompletion(val.data!.board, puzzle.solution);
    if (!verification.valid) {
      return errorResponse(400, "verification_failed", verification.error || "Solution is incorrect");
    }

    const mistakesCount = session.mistakes?.length || 0;
    const hintsUsed = session.hintsUsed || 0;
    const score = calculateScore(
      puzzle.difficulty as any,
      val.data!.elapsedTime,
      hintsUsed,
      mistakesCount
    );

    const updated = await completeSession(
      id, userResult.user.id, val.data!.board, val.data!.elapsedTime, score
    );
    if (!updated) return errorResponse(500, "complete_failed", "Failed to complete session");

    await updateUserStatsOnComplete(id, userResult.user.id);
    await updatePuzzleStatsOnComplete(id);

    return successResponse({
      ...updated,
      score,
      valid: true,
    });
  } catch (error: any) {
    console.error("[sudoku/complete]", error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
