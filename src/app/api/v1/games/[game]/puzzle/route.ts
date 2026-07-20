import { NextRequest } from "next/server";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { validate } from "@/lib/server/middleware/validate";
import { getPuzzleQuerySchema } from "@/lib/server/validators/puzzleValidator";
import { getGameRegistry } from "@/lib/server/puzzles/registry";
import { cacheHeaders, rateLimit } from "@/lib/server/utils/http";

/**
 * GET /api/v1/games/[game]/puzzle — play.
 * Returns a random puzzle for the given (optional) difficulty, excluding the
 * supplied puzzleId so "new game" avoids an immediate repeat.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ game: string }> }
) {
  if (!rateLimit(request, "games-play", 120)) {
    return errorResponse(429, "rate_limited", "Too many requests");
  }
  const { game } = await params;
  const reg = getGameRegistry(game);
  if (!reg) return errorResponse(404, "game_not_found", `Unknown game: ${game}`);

  const q = validate(getPuzzleQuerySchema, Object.fromEntries(new URL(request.url).searchParams));
  if (q.error) return q.error;

  try {
    await connectDB();
    const { difficulty, exclude } = q.data;
    const diff =
      difficulty ||
      reg.difficulties[Math.floor(Math.random() * reg.difficulties.length)];

    const match: any = { difficulty: diff };
    if (exclude) match.puzzleId = { $ne: exclude };

    const [doc] = await reg.model.aggregate([{ $match: match }, { $sample: { size: 1 } }]);
    if (!doc) return errorResponse(404, "no_puzzle", `No puzzle for difficulty ${diff}`);

    const res = successResponse(reg.toResponse(doc));
    Object.entries(cacheHeaders(30)).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
