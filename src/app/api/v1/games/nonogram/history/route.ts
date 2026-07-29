import { NextRequest } from "next/server";
import { withAuth } from "../route-helpers";
import NonogramPlaySession from "@/lib/server/models/NonogramPlaySession";
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

  const [results, total] = await Promise.all([
    NonogramPlaySession.aggregate([
      { $match: filter },
      { $sort: { lastSaveAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "nonogrampuzzles",
          localField: "puzzleId",
          foreignField: "puzzleId",
          as: "puzzle",
        },
      },
      { $unwind: { path: "$puzzle", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          sessionId: 1,
          puzzleId: 1,
          difficulty: 1,
          status: 1,
          elapsedTime: 1,
          hintsUsed: 1,
          mistakes: 1,
          "result.accuracy": 1,
          startedAt: 1,
          completedAt: 1,
          title: "$puzzle.title",
          size: "$puzzle.size",
          category: "$puzzle.category",
        },
      },
    ]),
    NonogramPlaySession.countDocuments(filter),
  ]);

  return successResponse({ sessions: results, total, limit, skip });
});
