import { NextRequest } from "next/server";
import { withAuth } from "../route-helpers";
import TangramPlaySession from "@/lib/server/models/TangramPlaySession";
import { successResponse } from "@/lib/server/utils/apiResponse";
import { sessionHistoryQuerySchema } from "@/lib/server/puzzles/tangram/validators";

export const GET = withAuth(async (req, user) => {
  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const parsed = sessionHistoryQuerySchema.safeParse(params);
  const { status, difficulty, limit, skip } = parsed.success ? parsed.data : { status: undefined, difficulty: undefined, limit: 20, skip: 0 };

  const filter: any = { userId: user.id };
  if (status) filter.status = status;
  if (difficulty) filter.difficulty = difficulty;

  const [results, total] = await Promise.all([
    TangramPlaySession.aggregate([
      { $match: filter },
      { $sort: { lastSaveAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "tangrampuzzles",
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
          category: "$puzzle.metadata.category",
        },
      },
    ]),
    TangramPlaySession.countDocuments(filter),
  ]);

  return successResponse({ sessions: results, total, limit, skip });
});
