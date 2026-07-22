import { NextRequest } from "next/server";
import { withAuth } from "../../route-helpers";
import { sessionService } from "@/lib/server/puzzles/nonogram/services/SessionService";
import { successResponse } from "@/lib/server/utils/apiResponse";

export const GET = withAuth(async (req, user, params) => {
  const { id } = params;
  const session = await sessionService.getSessionById(id, user.id);

  return successResponse({
    sessionId: session._id,
    puzzleId: session.puzzleId,
    difficulty: session.difficulty,
    status: session.status,
    grid: session.grid,
    elapsedSeconds: session.elapsedSeconds,
    hintsUsed: session.hintsUsed,
    mistakes: session.mistakes,
    restartCount: session.restartCount,
    startedAt: session.startedAt,
    pausedAt: session.pausedAt,
    completedAt: session.completedAt,
    completionResult: session.status === "completed" ? session.completionResult : undefined,
  });
});
