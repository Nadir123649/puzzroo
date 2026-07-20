import { NextRequest } from "next/server";
import GameProgress from "@/lib/server/models/GameProgress";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { auth } from "@/lib/server/middleware/auth";
import { validate } from "@/lib/server/middleware/validate";
import { saveProgressSchema } from "@/lib/server/validators/gameValidator";
import { trackServer } from "@/lib/server/utils/trackEvent";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const slug = (await params).slug;
  const action = slug?.[0];
  let body: any = {};
  try {
    body = await request.json();
  } catch {}

  const val = validate(saveProgressSchema, body);
  if (val.error) return val.error;

  await connectDB();

  const userResult = auth(request);
  if ("error" in userResult) return userResult.error;

  try {
    // POST /api/v1/games/progress
    if (!action || action === "progress") {
      const { gameId, puzzleId, difficulty, completed, score, time } = val.data!;
      const progress = await GameProgress.findOneAndUpdate(
        { userId: userResult.user.id, gameId, puzzleId },
        {
          userId: userResult.user.id, gameId, puzzleId, difficulty,
          completed: completed || false, score: score || 0, time: time || 0,
          completedAt: completed ? new Date() : null,
        },
        { upsert: true, new: true }
      );
      await trackServer({
        userId: userResult.user.id,
        event: completed ? "game_completed" : "game_progress",
        properties: { gameId, puzzleId, difficulty, score: score || 0, time: time || 0 },
        request,
      });
      return successResponse(progress);
    }

    return errorResponse(404, "not_found", "Route not found");
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const slug = (await params).slug;
  const action = slug?.[0];

  await connectDB();

  const userResult = auth(request);
  if ("error" in userResult) return userResult.error;

  try {
    // GET /api/v1/games/stats
    if (!action || action === "stats") {
      const [totalPlayed, totalCompleted, recentActivity] = await Promise.all([
        GameProgress.countDocuments({ userId: userResult.user.id }),
        GameProgress.countDocuments({ userId: userResult.user.id, completed: true }),
        GameProgress.find({ userId: userResult.user.id })
          .sort({ updatedAt: -1 })
          .limit(5)
          .select("gameId difficulty completed score time updatedAt"),
      ]);

      const completionRate = totalPlayed > 0 ? Math.round((totalCompleted / totalPlayed) * 100) : 0;
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      const streak = await GameProgress.countDocuments({
        userId: userResult.user.id, completed: true,
        completedAt: { $gte: lastWeek },
      });

      return successResponse({
        gamesPlayed: totalPlayed,
        completed: totalCompleted,
        currentStreak: streak,
        completionRate: `${completionRate}%`,
        recentActivity: recentActivity.map((a) => ({
          gameId: a.gameId, difficulty: a.difficulty,
          completed: a.completed, score: a.score, time: a.time, lastPlayed: a.updatedAt,
        })),
      });
    }

    return errorResponse(404, "not_found", "Route not found");
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
