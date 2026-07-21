import { NextRequest } from "next/server";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { getGameRegistry } from "@/lib/server/puzzles/registry";
import { cacheHeaders, rateLimit } from "@/lib/server/utils/http";

/** GET /api/v1/games/[game]/puzzle/[id] — fetch a specific puzzle (replay/resume). */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ game: string; id: string }> }
) {
  if (!rateLimit(request, "games-puzzle-by-id", 120)) {
    return errorResponse(429, "rate_limited", "Too many requests");
  }
  const { game, id } = await params;
  const reg = getGameRegistry(game);
  if (!reg) return errorResponse(404, "game_not_found", `Unknown game: ${game}`);

  await connectDB();
  try {
    const doc = await reg.model.findOne({ puzzleId: id }).lean();
    if (!doc) return errorResponse(404, "puzzle_not_found", `No puzzle with id ${id}`);

    const res = successResponse(reg.toResponse(doc));
    Object.entries(cacheHeaders(300)).forEach(([k, v]) => res.headers.set(k, v));
    return res;
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
