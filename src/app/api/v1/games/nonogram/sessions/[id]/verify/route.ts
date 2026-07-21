import { NextRequest } from "next/server";
import { withAuth } from "../../../route-helpers";
import { verificationEngine } from "@/lib/server/puzzles/nonogram/services/VerificationEngine";
import { sessionVerifySchema } from "@/lib/server/puzzles/nonogram/validators";
import { successResponse } from "@/lib/server/utils/apiResponse";
import NonogramPuzzle from "@/lib/server/models/NonogramPuzzle";

export const POST = withAuth(async (req, user, params) => {
  const { id } = params;
  const body = await req.json();
  const parsed = sessionVerifySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { success: false, payload: { error: { code: "validation_error", message: parsed.error.issues[0].message } }, timestamp: Date.now() },
      { status: 400 }
    );
  }

  const session = await (
    await import("@/lib/server/models/PlaySession")
  ).default.findById(id);
  if (!session) {
    return Response.json(
      { success: false, payload: { error: { code: "session_not_found", message: "Session not found." } }, timestamp: Date.now() },
      { status: 404 }
    );
  }
  if (session.userId.toString() !== user.id) {
    return Response.json(
      { success: false, payload: { error: { code: "not_owner", message: "You do not own this session." } }, timestamp: Date.now() },
      { status: 403 }
    );
  }

  const result = await verificationEngine.verifyCompletion(session.puzzleId, parsed.data.grid);

  return successResponse({
    isComplete: result.isComplete,
    accuracy: result.accuracy,
    totalCellsRequired: result.totalCellsRequired,
    correctCells: result.correctCells,
    mistakes: result.mistakes,
    rowValidation: result.rowValidation,
    columnValidation: result.columnValidation,
  });
});
