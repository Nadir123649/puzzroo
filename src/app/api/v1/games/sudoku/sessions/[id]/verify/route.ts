import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { validate } from "@/lib/server/middleware/validate";
import { verifyCompletionSchema } from "@/lib/server/validators/sudokuValidator";
import { verifyCompletion } from "@/lib/server/services/sudoku/verificationService";
import { getSession } from "@/lib/server/services/sudoku/sessionService";
import SudokuPuzzle from "@/lib/server/models/SudokuPuzzle";
import { connectDB } from "@/lib/server/db";
import { rateLimit } from "@/lib/server/utils/http";
import { withAuth } from "../../../route-helpers";

export const POST = withAuth(async (req: NextRequest, actor, params) => {
  if (!rateLimit(req, "sudoku-verify", 60)) {
    return errorResponse(429, "rate_limited", "Too many requests");
  }
  let body: any = {};
  try { body = await req.json(); } catch {}

  const val = validate(verifyCompletionSchema, body);
  if (val.error) return val.error;

  const session = await getSession(params.id, actor);
  if (session.status !== "playing") throw new Error("session_not_active");

  await connectDB();
  const puzzle = await SudokuPuzzle.findOne({ puzzleId: session.puzzleId }).lean();
  if (!puzzle) throw new Error("puzzle_not_found");

  const result = await verifyCompletion(val.data!.board, puzzle.solution);
  return successResponse(result);
});
