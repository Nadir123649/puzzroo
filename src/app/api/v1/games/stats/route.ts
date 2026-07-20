import { NextRequest } from "next/server";
import GameProgress from "@/lib/server/models/GameProgress";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { auth } from "@/lib/server/middleware/auth";

/** GET /api/v1/games/stats — per-user aggregate progress. Auth required. */
export async function GET(request: NextRequest) {
  await connectDB();
  const userResult = await auth(request);
  if ("error" in userResult) return userResult.error;

  try {
    const [totalPlayed, totalCompleted, agg, recentActivity] = await Promise.all([
      GameProgress.countDocuments({ userId: userResult.user.id }),
      GameProgress.countDocuments({ userId: userResult.user.id, completed: true }),
      GameProgress.aggregate([
        { $match: { userId: userResult.user.id } },
        {
          $group: {
            _id: null,
            hintsUsed: { $sum: "$hintsUsed" },
            mistakes: { $sum: "$mistakes" },
            totalMoves: { $sum: "$moves" },
          },
        },
      ]),
      GameProgress.find({ userId: userResult.user.id })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select("gameId difficulty completed score time updatedAt"),
    ]);

    const completionRate = totalPlayed > 0 ? Math.round((totalCompleted / totalPlayed) * 100) : 0;
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    const streak = await GameProgress.countDocuments({
      userId: userResult.user.id,
      completed: true,
      completedAt: { $gte: lastWeek },
    });

    const totals = agg[0] || { hintsUsed: 0, mistakes: 0, totalMoves: 0 };

    return successResponse({
      gamesPlayed: totalPlayed,
      completed: totalCompleted,
      currentStreak: streak,
      completionRate: `${completionRate}%`,
      totalHintsUsed: totals.hintsUsed,
      totalMistakes: totals.mistakes,
      totalMoves: totals.totalMoves,
      recentActivity: recentActivity.map((a: any) => ({
        gameId: a.gameId,
        difficulty: a.difficulty,
        completed: a.completed,
        score: a.score,
        time: a.time,
        lastPlayed: a.updatedAt,
      })),
    });
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
