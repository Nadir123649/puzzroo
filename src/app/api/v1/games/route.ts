import { NextRequest } from "next/server";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { getGameRegistry } from "@/lib/server/puzzles/registry";
import { rateLimit } from "@/lib/server/utils/http";

const GAMES = ["sudoku", "nonogram", "crossmath", "tangram"] as const;

/** GET /api/v1/games — catalog with per-difficulty counts. */
export async function GET(request: NextRequest) {
  if (!rateLimit(request, "games-catalog", 120)) {
    return errorResponse(429, "rate_limited", "Too many requests");
  }
  await connectDB();
  try {
    const catalog = [];
    for (const game of GAMES) {
      const reg = getGameRegistry(game)!;
      const byDifficulty: Record<string, number> = {};
      for (const diff of reg.difficulties) {
        byDifficulty[diff] = await reg.model.countDocuments({ difficulty: diff });
      }
      const total = Object.values(byDifficulty).reduce((a, b) => a + b, 0);
      catalog.push({ game, total, byDifficulty });
    }
    const res = successResponse(catalog);
    res.headers.set("Cache-Control", "public, max-age=300");
    return res;
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
