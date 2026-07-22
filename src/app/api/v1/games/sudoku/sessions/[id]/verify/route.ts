import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { validate } from "@/lib/server/middleware/validate";
import { verifyCompletionSchema } from "@/lib/server/validators/sudokuValidator";
import { verifyCompletion } from "@/lib/server/services/sudoku/verificationService";
import { getSession } from "@/lib/server/services/sudoku/sessionService";
import SudokuPuzzle from "@/lib/server/models/SudokuPuzzle";
import { auth } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userResult = await auth(request);
  if ("error" in userResult) return userResult.error;

  let body: any = {};
  try { body = await request.json(); } catch {}

  const val = validate(verifyCompletionSchema, body);
  if (val.error) return val.error;

  try {
    const { id } = await params;
    const session = await getSession(id, userResult.user.id);
    if (!session) return errorResponse(404, "session_not_found", "Session not found");
    if (session.status !== "playing") {
      return errorResponse(400, "session_not_active", "Session is not active");
    }

    await connectDB();
    const puzzle = await SudokuPuzzle.findById(session.puzzleId).lean();
    if (!puzzle) return errorResponse(404, "puzzle_not_found", "Puzzle not found");

    const result = await verifyCompletion(val.data!.board, puzzle.solution);

    return successResponse(result);
  } catch (error: any) {
    console.error("[sudoku/verify]", error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
