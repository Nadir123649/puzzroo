import { NextRequest } from "next/server";
import { withAuth } from "../../../route-helpers";
import { sessionService } from "@/lib/server/puzzles/nonogram/services/SessionService";
import { successResponse } from "@/lib/server/utils/apiResponse";
import NonogramPuzzle from "@/lib/server/models/NonogramPuzzle";

export const POST = withAuth(async (req, user, params) => {
  const { id } = params;
  const currentSession = await sessionService.getSessionById(id, user.id);
  const puzzle = await NonogramPuzzle.findOne({ puzzleId: currentSession.puzzleId }).lean();
  if (!puzzle) {
    return Response.json(
      { success: false, payload: { error: { code: "puzzle_not_found", message: "Puzzle not found." } }, timestamp: Date.now() },
      { status: 404 }
    );
  }

  const session = await sessionService.replaySession(user.id, currentSession.puzzleId, currentSession.difficulty);
  return successResponse({
    sessionId: session._id,
    puzzleId: session.puzzleId,
    difficulty: session.difficulty,
    status: session.status,
    grid: session.grid,
    startedAt: session.startedAt,
  }, 201);
});
