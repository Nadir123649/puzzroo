import { NextRequest } from "next/server";
import { withAuth } from "../route-helpers";
import PlaySession from "@/lib/server/models/PlaySession";
import NonogramPuzzle from "@/lib/server/models/NonogramPuzzle";
import { successResponse } from "@/lib/server/utils/apiResponse";

export const GET = withAuth(async (req, user) => {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "10"), 50);

  const sessions = await PlaySession.find({ userId: user.id })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .lean();

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
        category: (puzzle as any)?.category || "",
        difficulty: s.difficulty,
        status: s.status,
        elapsedSeconds: s.elapsedSeconds,
        updatedAt: s.updatedAt,
      };
    })
  );

  return successResponse({ sessions: results });
});
