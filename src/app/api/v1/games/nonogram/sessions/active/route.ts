import { NextRequest } from "next/server";
import { withAuth } from "../../route-helpers";
import { sessionService } from "@/lib/server/puzzles/nonogram/services/SessionService";
import { successResponse } from "@/lib/server/utils/apiResponse";

export const GET = withAuth(async (req) => {
  const url = new URL(req.url);
  const puzzleId = url.searchParams.get("puzzleId") || undefined;

  const session = await sessionService.getActiveSession(
    req.headers.get("x-user-id") || "",
    puzzleId
  );

  if (!session) {
    return successResponse({ hasActiveSession: false, session: null });
  }

  return successResponse({
    hasActiveSession: true,
    session: {
      sessionId: session._id,
      puzzleId: session.puzzleId,
      difficulty: session.difficulty,
      status: session.status,
      grid: session.grid,
      elapsedSeconds: session.elapsedSeconds,
      hintsUsed: session.hintsUsed,
      mistakes: session.mistakes,
      startedAt: session.startedAt,
      pausedAt: session.pausedAt,
    },
  });
});
