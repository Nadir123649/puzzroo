import { NextRequest } from "next/server";
import { withAuth } from "../route-helpers";
import { sessionService } from "@/lib/server/puzzles/nonogram/services/SessionService";
import NonogramPuzzle from "@/lib/server/models/NonogramPuzzle";
import { successResponse } from "@/lib/server/utils/apiResponse";

export const GET = withAuth(async (req, user) => {
  const activeSession = await sessionService.getActiveSession(user.id);

  if (!activeSession) {
    return successResponse({ hasActiveSession: false });
  }

  const puzzle = await NonogramPuzzle.findOne({ puzzleId: activeSession.puzzleId }).lean();

  return successResponse({
    hasActiveSession: true,
    session: {
      sessionId: activeSession._id,
      puzzleId: activeSession.puzzleId,
      difficulty: activeSession.difficulty,
      status: activeSession.status,
      elapsedSeconds: activeSession.elapsedSeconds,
      hintsUsed: activeSession.hintsUsed,
      mistakes: activeSession.mistakes,
      startedAt: activeSession.startedAt,
      pausedAt: activeSession.pausedAt,
    },
    puzzle: puzzle
      ? {
          id: puzzle.puzzleId,
          title: puzzle.title,
          difficulty: puzzle.difficulty,
          size: puzzle.size,
          category: puzzle.category,
          estimatedTime: puzzle.estimatedTime,
          rowClues: (puzzle.rowClues as number[][]).map((values) => ({ values })),
          columnClues: (puzzle.columnClues as number[][]).map((values) => ({ values })),
        }
      : undefined,
  });
});
