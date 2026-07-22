import { NextRequest } from "next/server";
import { withAuth } from "../../../route-helpers";
import { sessionService } from "@/lib/server/puzzles/nonogram/services/SessionService";
import { verificationEngine } from "@/lib/server/puzzles/nonogram/services/VerificationEngine";
import { statisticsService } from "@/lib/server/puzzles/nonogram/services/StatisticsService";
import { sessionVerifySchema } from "@/lib/server/puzzles/nonogram/validators";
import { successResponse } from "@/lib/server/utils/apiResponse";
import NonogramPuzzle from "@/lib/server/models/NonogramPuzzle";
import PlaySession from "@/lib/server/models/PlaySession";

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

  const session = await PlaySession.findById(id);
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

  const verifyResult = await verificationEngine.verifyCompletion(session.puzzleId, parsed.data.grid);

  if (!verifyResult.isComplete) {
    return successResponse({
      completed: false,
      message: "Puzzle is not complete. Check your solution.",
      verification: {
        accuracy: verifyResult.accuracy,
        mistakes: verifyResult.mistakes,
        rowValidation: verifyResult.rowValidation,
        columnValidation: verifyResult.columnValidation,
      },
    });
  }

  const completedSession = await sessionService.completeSession(id, user.id, {
    isComplete: true,
    accuracy: verifyResult.accuracy,
    totalCells: verifyResult.totalCellsRequired,
    correctCells: verifyResult.correctCells,
  });

  const puzzle = await NonogramPuzzle.findOne({ puzzleId: session.puzzleId }).lean();

  await statisticsService.updateOnSessionComplete(
    user.id,
    session.puzzleId,
    session.difficulty,
    session.elapsedSeconds || 0,
    session.hintsUsed || 0,
    session.mistakes || 0,
    verifyResult.accuracy
  );

  return successResponse({
    completed: true,
    sessionId: completedSession._id,
    accuracy: verifyResult.accuracy,
    elapsedSeconds: session.elapsedSeconds,
    hintsUsed: session.hintsUsed,
    mistakes: session.mistakes,
    completedAt: completedSession.completedAt,
    title: puzzle?.title,
  });
});
