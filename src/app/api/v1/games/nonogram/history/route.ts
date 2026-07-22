import { NextRequest } from "next/server";
import { withAuth } from "../route-helpers";
import PlaySession from "@/lib/server/models/PlaySession";
import NonogramPuzzle from "@/lib/server/models/NonogramPuzzle";
import { successResponse } from "@/lib/server/utils/apiResponse";

export const GET = withAuth(async (req, user) => {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
  const skip = parseInt(url.searchParams.get("skip") || "0");
  const status = url.searchParams.get("status") || undefined;
  const difficulty = url.searchParams.get("difficulty") || undefined;

  const filter: any = { userId: user.id };
  if (status && ["active", "paused", "completed", "abandoned"].includes(status)) {
    filter.status = status;
  }
  if (difficulty && ["easy", "medium", "hard", "expert"].includes(difficulty)) {
    filter.difficulty = difficulty;
  }

  const [sessions, total] = await Promise.all([
    PlaySession.find(filter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    PlaySession.countDocuments(filter),
  ]);

  const results = await Promise.all(
    sessions.map(async (s) => {
      const puzzle = await NonogramPuzzle.findOne({ puzzleId: s.puzzleId })
        .select("title size category")
        .lean();
      return {
        sessionId: s._id,
        puzzleId: s.puzzleId,
        title: (puzzle as any)?.title || "",
        size: (puzzle as any)?.size || 0,
        difficulty: s.difficulty,
        status: s.status,
        elapsedSeconds: s.elapsedSeconds,
        hintsUsed: s.hintsUsed,
        mistakes: s.mistakes,
        accuracy: (s as any).completionResult?.accuracy || 0,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
      };
    })
  );

  return successResponse({ sessions: results, total, limit, skip });
});
