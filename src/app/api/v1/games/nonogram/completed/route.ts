import { NextRequest } from "next/server";
import { withAuth } from "../route-helpers";
import PlaySession from "@/lib/server/models/PlaySession";
import { successResponse } from "@/lib/server/utils/apiResponse";

export const GET = withAuth(async (req, user) => {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100);
  const skip = parseInt(url.searchParams.get("skip") || "0");

  const sessions = await PlaySession.find({
    userId: user.id,
    status: "completed",
  })
    .sort({ completedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await PlaySession.countDocuments({
    userId: user.id,
    status: "completed",
  });

  const results = sessions.map((s) => ({
    sessionId: s._id,
    puzzleId: s.puzzleId,
    difficulty: s.difficulty,
    elapsedSeconds: s.elapsedSeconds,
    hintsUsed: s.hintsUsed,
    mistakes: s.mistakes,
    accuracy: (s as any).completionResult?.accuracy || 0,
    completedAt: s.completedAt,
  }));

  return successResponse({ sessions: results, total, limit, skip });
});
