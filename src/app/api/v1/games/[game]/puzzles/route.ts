import { NextRequest } from "next/server";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { validate } from "@/lib/server/middleware/validate";
import { listPuzzlesQuerySchema } from "@/lib/server/validators/puzzleValidator";
import { getGameRegistry } from "@/lib/server/puzzles/registry";
import { cacheHeaders, rateLimit } from "@/lib/server/utils/http";

/** GET /api/v1/games/[game]/puzzles — paginated catalog listing (cursor by _id). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ game: string }> }
) {
  if (!rateLimit(request, "games-listing", 120)) {
    return errorResponse(429, "rate_limited", "Too many requests");
  }
  const { game } = await params;
  const reg = getGameRegistry(game);
  if (!reg) return errorResponse(404, "game_not_found", `Unknown game: ${game}`);

  const q = validate(listPuzzlesQuerySchema, Object.fromEntries(new URL(request.url).searchParams));
  if (q.error) return q.error;

  await connectDB();
  try {
    const { difficulty, limit, cursor } = q.data;
    const filter: any = {};
    if (difficulty) filter.difficulty = difficulty;
    if (cursor) filter._id = { $gt: cursor };

    const docs = await reg.model
      .find(filter)
      .sort({ _id: 1 })
      .limit(limit)
      .lean();

    const items = docs.map((d: any) => ({
      id: d.puzzleId,
      difficulty: d.difficulty,
      title: d.title,
      size: d.size,
      givens: d.givens,
      tier: d.tier,
      category: d.category,
      estimatedTime: d.estimatedTime,
    }));

    const nextCursor =
      docs.length === limit ? String(docs[docs.length - 1]._id) : null;

    const res = successResponse({ items, nextCursor });
    Object.entries(cacheHeaders(60)).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
