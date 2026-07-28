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
import { connectDB } from "@/lib/server/db";
import { rateLimit } from "@/lib/server/utils/http";
import { withAuth } from "../../../route-helpers";

export const POST = withAuth(async (req: NextRequest, user, params) => {
  if (!rateLimit(req, "sudoku-complete", 30)) {
    return errorResponse(429, "rate_limited", "Too many requests");
  }

  let body: any = {};
  try { body = await req.json(); } catch {}

  const val = validate(completeSessionSchema, body);
  if (val.error) return val.error;

  const session = await getSession(params.id, user.id);
  if (session.status !== "playing") throw new Error("session_not_active");

  await connectDB();
  const puzzle = await SudokuPuzzle.findOne({ puzzleId: session.puzzleId }).lean();
  if (!puzzle) throw new Error("puzzle_not_found");

  const verification = await verifyCompletion(val.data!.board, puzzle.solution);
  if (!verification.valid) {
    return errorResponse(400, "verification_failed", verification.error || "Solution is incorrect");
  }

  const hintsUsed = val.data!.hintsUsed ?? session.hintsUsed ?? 0;
  const mistakes = val.data!.mistakes ?? session.mistakes ?? 0;
  const score = calculateScore(
    puzzle.difficulty as any,
    val.data!.elapsedTime,
    hintsUsed,
    mistakes
  );
  const moves = val.data!.moves ?? session.moves ?? 0;

  const updated = await completeSession(
    params.id, user.id, val.data!.board, val.data!.elapsedTime,
    hintsUsed, mistakes, moves, score
  );

  updateUserStatsOnComplete(params.id, user.id).catch(() => {});
  updatePuzzleStatsOnComplete(params.id).catch(() => {});

  return successResponse({
    ...updated,
    score,
    moves,
    hintsUsed,
    mistakes,
    valid: true,
  });
});
