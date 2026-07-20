import { NextRequest } from "next/server";
import mongoose from "mongoose";
import GameProgress from "@/lib/server/models/GameProgress";
import User from "@/lib/server/models/User";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { validate } from "@/lib/server/middleware/validate";
import { leaderboardQuerySchema } from "@/lib/server/validators/puzzleValidator";
import { getGameRegistry } from "@/lib/server/puzzles/registry";
import { cacheHeaders, rateLimit } from "@/lib/server/utils/http";

/**
 * GET /api/v1/games/[game]/leaderboard — top completions for a game.
 * Public. Sorted by score desc, then time asc. Cursor is a numeric offset.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ game: string }> }
) {
  if (!rateLimit(request, "games-leaderboard", 120)) {
    return errorResponse(429, "rate_limited", "Too many requests");
  }
  const { game } = await params;
  if (!getGameRegistry(game)) return errorResponse(404, "game_not_found", `Unknown game: ${game}`);

  const q = validate(leaderboardQuerySchema, Object.fromEntries(new URL(request.url).searchParams));
  if (q.error) return q.error;

  await connectDB();
  try {
    const { difficulty, period, limit, cursor } = q.data;
    const match: any = { gameId: game, completed: true };
    if (difficulty) match.difficulty = difficulty;
    if (period === "week") {
      const since = new Date();
      since.setDate(since.getDate() - 7);
      match.completedAt = { $gte: since };
    } else if (period === "month") {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      match.completedAt = { $gte: since };
    }

    const offset = cursor ? parseInt(cursor, 10) || 0 : 0;

    const docs = await GameProgress.find(match)
      .sort({ score: -1, time: 1, completedAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    const userIds = docs.map((d: any) => d.userId);
    const users = await User.find({ _id: { $in: userIds } }).lean();
    const userMap = new Map(users.map((u: any) => [String(u._id), u.username || u.publicId]));

    const items = docs.map((d: any) => ({
      userId: String(d.userId),
      username: userMap.get(String(d.userId)) || "player",
      puzzleId: d.puzzleId,
      difficulty: d.difficulty,
      score: d.score,
      time: d.time,
      hintsUsed: d.hintsUsed,
      mistakes: d.mistakes,
      completedAt: d.completedAt,
    }));

    const res = successResponse({ items, nextCursor: String(offset + limit) });
    Object.entries(cacheHeaders(60)).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
