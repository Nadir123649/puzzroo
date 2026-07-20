import { NextRequest } from "next/server";
import GameProgress from "@/lib/server/models/GameProgress";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { auth } from "@/lib/server/middleware/auth";
import { validate } from "@/lib/server/middleware/validate";
import { saveProgressSchema } from "@/lib/server/validators/gameValidator";
import { trackServer } from "@/lib/server/utils/trackEvent";

/**
 * POST /api/v1/games/progress — save in-progress or completed state.
 * Auth required (guest progress stays in localStorage only).
 */
export async function POST(request: NextRequest) {
  let body: any = {};
  try {
    body = await request.json();
  } catch {}

  const val = validate(saveProgressSchema, body);
  if (val.error) return val.error;

  await connectDB();

  const userResult = await auth(request);
  if ("error" in userResult) return userResult.error;

  try {
    const { gameId, puzzleId, difficulty, completed, score, time, hintsUsed, mistakes, moves, resumeState } =
      val.data!;

    const update: any = {
      userId: userResult.user.id,
      gameId,
      puzzleId,
      difficulty,
      completed: completed || false,
      score: score || 0,
      time: time || 0,
      hintsUsed: hintsUsed || 0,
      mistakes: mistakes || 0,
      moves: moves || 0,
    };
    if (resumeState !== undefined) update.resumeState = resumeState;
    if (completed) update.completedAt = new Date();

    const progress = await GameProgress.findOneAndUpdate(
      { userId: userResult.user.id, gameId, puzzleId },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await trackServer({
      userId: userResult.user.id,
      event: completed ? "game_completed" : "game_progress",
      properties: { gameId, puzzleId, difficulty, score: score || 0, time: time || 0 },
      request,
    });

    return successResponse(progress);
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}

/**
 * GET /api/v1/games/progress?gameId=&puzzleId= — fetch saved progress / resume state.
 * Auth required.
 */
export async function GET(request: NextRequest) {
  await connectDB();
  const userResult = await auth(request);
  if ("error" in userResult) return userResult.error;

  try {
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const gameId = params.gameId;
    const puzzleId = params.puzzleId;

    if (puzzleId && gameId) {
      const rec = await GameProgress.findOne({
        userId: userResult.user.id,
        gameId,
        puzzleId,
      }).lean();
      return successResponse(rec || null);
    }

    const filter: any = { userId: userResult.user.id };
    if (gameId) filter.gameId = gameId;
    const recs = await GameProgress.find(filter).sort({ updatedAt: -1 }).lean();
    return successResponse(recs);
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
