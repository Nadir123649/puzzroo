import { NextRequest } from "next/server";
import { withAuth } from "../../../route-helpers";
import { sessionService } from "@/lib/server/puzzles/nonogram/services/SessionService";
import { successResponse } from "@/lib/server/utils/apiResponse";

export const GET = withAuth(async (req, user, params) => {
  const { id } = params;
  const session = await sessionService.getSessionById(id, user.id);

  if (session.status !== "completed") {
    return Response.json(
      { success: false, payload: { error: { code: "session_not_completed", message: "Session is not completed." } }, timestamp: Date.now() },
      { status: 400 }
    );
  }

  return successResponse({
    sessionId: session._id,
    puzzleId: session.puzzleId,
    difficulty: session.difficulty,
    status: session.status,
    elapsedSeconds: session.elapsedSeconds,
    hintsUsed: session.hintsUsed,
    mistakes: session.mistakes,
    restartCount: session.restartCount,
    accuracy: session.completionResult?.accuracy || 0,
    totalCells: session.completionResult?.totalCells || 0,
    correctCells: session.completionResult?.correctCells || 0,
    completedAt: session.completedAt,
    startedAt: session.startedAt,
  });
});
