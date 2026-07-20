import { NextRequest } from "next/server";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { validate } from "@/lib/server/middleware/validate";
import { getPuzzleQuerySchema } from "@/lib/server/validators/puzzleValidator";
import { getGameRegistry } from "@/lib/server/puzzles/registry";
import { dateToSeed, todayString } from "@/lib/server/puzzles/daily";
import { cacheHeaders, rateLimit } from "@/lib/server/utils/http";

/**
 * GET /api/v1/games/[game]/daily?date=YYYY-MM-DD&difficulty=optional
 * Deterministic: same date always yields the same puzzle for a given game.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ game: string }> }
) {
  if (!rateLimit(request, "games-daily", 120)) {
    return errorResponse(429, "rate_limited", "Too many requests");
  }
  const { game } = await params;
  const reg = getGameRegistry(game);
  if (!reg) return errorResponse(404, "game_not_found", `Unknown game: ${game}`);

  const q = validate(getPuzzleQuerySchema, Object.fromEntries(new URL(request.url).searchParams));
  if (q.error) return q.error;

  await connectDB();
  try {
    const date = q.data.date || todayString();
    const seed = dateToSeed(date);
    const difficulty =
      q.data.difficulty || reg.difficulties[seed % reg.difficulties.length];

    const count = await reg.model.countDocuments({ difficulty });
    if (count === 0) {
      return errorResponse(404, "no_puzzle", `No daily puzzle for difficulty ${difficulty}`);
    }
    const dailyIndex = seed % count;

    const doc = await reg.model.findOne({ difficulty, dailyIndex }).lean();
    if (!doc) return errorResponse(404, "puzzle_not_found", "Daily puzzle not found");

    const res = successResponse({ ...(reg.toResponse(doc) as object), date, difficulty });
    Object.entries(cacheHeaders(86400)).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
