import { NextRequest } from "next/server";
import GameProgress from "@/lib/server/models/GameProgress";
import UserStatistics from "@/lib/server/models/UserStatistics";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { auth } from "@/lib/server/middleware/auth";

/** GET /api/v1/games/stats — per-user aggregate progress & game breakdown. Auth required. */
export async function GET(request: NextRequest) {
  await connectDB();
  const userResult = await auth(request);
  if ("error" in userResult) return userResult.error;

  const userId = userResult.user.id;

  try {
    const [totalPlayed, totalCompleted, agg, perGameAgg, userStatsList, recentActivity] = await Promise.all([
      GameProgress.countDocuments({ userId }),
      GameProgress.countDocuments({ userId, completed: true }),
      GameProgress.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: null,
            hintsUsed: { $sum: "$hintsUsed" },
            mistakes: { $sum: "$mistakes" },
            totalMoves: { $sum: "$moves" },
          },
        },
      ]),
      GameProgress.aggregate([
        { $match: { userId } },
        {
          $group: {
            _id: "$gameId",
            played: { $sum: 1 },
            completed: {
              $sum: { $cond: [{ $eq: ["$completed", true] }, 1, 0] },
            },
            hintsUsed: { $sum: "$hintsUsed" },
            mistakes: { $sum: "$mistakes" },
          },
        },
      ]),
      UserStatistics.find({ userId }).lean(),
      GameProgress.find({ userId })
        .sort({ updatedAt: -1 })
        .limit(10)
        .select("gameId puzzleId difficulty completed score time updatedAt"),
    ]);

    const completionRate = totalPlayed > 0 ? Math.round((totalCompleted / totalPlayed) * 100) : 0;
    
    // Calculate current streak: consecutive days with at least one completed game
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check each day going backwards from today
    let checkDate = new Date(today);
    let streakBroken = false;
    
    while (!streakBroken && currentStreak < 365) { // Max 365 days to prevent infinite loop
      const dayStart = new Date(checkDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(checkDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      const completedToday = await GameProgress.countDocuments({
        userId,
        completed: true,
        completedAt: { $gte: dayStart, $lte: dayEnd },
      });
      
      if (completedToday > 0) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1); // Move to previous day
      } else {
        // If it's today and no games completed, don't break streak yet
        if (checkDate.getTime() === today.getTime()) {
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          streakBroken = true;
        }
      }
    }

    const totals = agg[0] || { hintsUsed: 0, mistakes: 0, totalMoves: 0 };

    const gameIds = ["sudoku", "crossmath", "nonogram", "tangram"];
    const byGame: Record<string, any> = {};

    for (const gid of gameIds) {
      const gAgg = perGameAgg.find((g: any) => g._id === gid);
      const uStat = userStatsList.find((u: any) => u.gameId === gid);

      const played = Math.max(gAgg?.played || 0, uStat?.totalPlayed || 0);
      const completed = Math.max(gAgg?.completed || 0, uStat?.totalCompleted || 0);
      const rate = played > 0 ? Math.round((completed / played) * 100) : 0;

      byGame[gid] = {
        gamesPlayed: played,
        completed,
        completionRate: `${rate}%`,
        hintsUsed: Math.max(gAgg?.hintsUsed || 0, uStat?.totalHintsUsed || 0),
        mistakes: Math.max(gAgg?.mistakes || 0, uStat?.totalMistakes || 0),
      };
    }

    return successResponse({
      gamesPlayed: totalPlayed,
      completed: totalCompleted,
      currentStreak: currentStreak,
      completionRate: `${completionRate}%`,
      totalHintsUsed: totals.hintsUsed,
      totalMistakes: totals.mistakes,
      totalMoves: totals.totalMoves,
      byGame,
      recentActivity: recentActivity.map((a: any) => ({
        gameId: a.gameId,
        puzzleId: a.puzzleId,
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
