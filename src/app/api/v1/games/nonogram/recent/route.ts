import { NextRequest } from "next/server";
import { withAuth } from "../route-helpers";
import NonogramPlaySession from "@/lib/server/models/NonogramPlaySession";
import { successResponse } from "@/lib/server/utils/apiResponse";

export const GET = withAuth(async (req, user) => {
  const url = new URL(req.url);
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "10"), 50);

  const results = await NonogramPlaySession.aggregate([
    { $match: { userId: user.id } },
    { $sort: { lastSaveAt: -1 } },
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
        startedAt: 1,
        completedAt: 1,
        updatedAt: "$lastSaveAt",
        title: "$puzzle.title",
        size: "$puzzle.size",
        category: "$puzzle.category",
      },
    },
  ]);

  return successResponse({ sessions: results });
});
