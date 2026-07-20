import { NextRequest } from "next/server";
import GameProgress from "@/lib/server/models/GameProgress";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { auth } from "@/lib/server/middleware/auth";
import { validate } from "@/lib/server/middleware/validate";
import { completeSchema } from "@/lib/server/validators/puzzleValidator";
import { trackServer } from "@/lib/server/utils/trackEvent";

/**
 * POST /api/v1/games/[game]/complete — mark completion + record analytics.
 * Auth required. Idempotent: recomputes bestTime and bumps attempts.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ game: string }> }
) {
  const { game } = await params;

  let body: any = {};
  try {
    body = await request.json();
  } catch {}
  body.gameId = game;

  const val = validate(completeSchema, body);
  if (val.error) return val.error;

  await connectDB();
  const userResult = await auth(request);
  if ("error" in userResult) return userResult.error;

  try {
    const { puzzleId, difficulty, score, time, hintsUsed, mistakes, moves } = val.data!;

    const existing = await GameProgress.findOne({
      userId: userResult.user.id,
      gameId: game,
      puzzleId,
    });

    const bestTime = existing?.completedAt
      ? Math.min(existing.bestTime || time || 0, time || 0) || time || 0
      : time || 0;

    const progress = await GameProgress.findOneAndUpdate(
      { userId: userResult.user.id, gameId: game, puzzleId },
      {
        userId: userResult.user.id,
        gameId: game,
        puzzleId,
        difficulty,
        completed: true,
        score: score || 0,
        time: time || 0,
        hintsUsed: hintsUsed || 0,
        mistakes: mistakes || 0,
        moves: moves || 0,
        bestTime,
        attempts: (existing?.attempts || 0) + 1,
        completedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await trackServer({
      userId: userResult.user.id,
      event: "game_completed",
      properties: { gameId: game, puzzleId, difficulty, score: score || 0, time: time || 0, hintsUsed, mistakes },
      request,
    });

    const [totalPlayed, totalCompleted] = await Promise.all([
      GameProgress.countDocuments({ userId: userResult.user.id }),
      GameProgress.countDocuments({ userId: userResult.user.id, completed: true }),
    ]);

    return successResponse({
      progress,
      stats: { gamesPlayed: totalPlayed, completed: totalCompleted },
    });
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
