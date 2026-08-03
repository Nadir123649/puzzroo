import { NextRequest } from "next/server";
import { withAuth } from "../../route-helpers";
import type { Actor } from "../../route-helpers";
import DailyChallenge from "@/lib/server/models/DailyChallenge";
import { successResponse } from "@/lib/server/utils/apiResponse";

export const GET = withAuth(async (req: NextRequest, actor: Actor) => {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "30"), 365);
  const skip = parseInt(url.searchParams.get("skip") || "0");

  if (actor.type === "guest") {
    return successResponse({ challenges: [], total: 0, limit, skip });
  }

  const [challenges, total] = await Promise.all([
    DailyChallenge.find({ userId: actor.id })
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    DailyChallenge.countDocuments({ userId: actor.id }),
  ]);

  const results = challenges.map((c) => ({
    date: c.date,
    puzzleId: c.puzzleId,
    difficulty: c.difficulty,
    status: c.status,
    elapsedSeconds: c.elapsedSeconds,
    hintsUsed: c.hintsUsed,
    mistakes: c.mistakes,
    accuracy: c.accuracy,
    completedAt: c.completedAt,
  }));

  return successResponse({ challenges: results, total, limit, skip });
});
