import { NextRequest } from "next/server";
import { withAuth } from "../../route-helpers";
import DailyChallenge from "@/lib/server/models/DailyChallenge";
import { successResponse } from "@/lib/server/utils/apiResponse";

export const GET = withAuth(async (req, user) => {
  const [totalChallenges, completedChallenges, currentStreak, longestStreak] = await Promise.all([
    DailyChallenge.countDocuments({ userId: user.id }),
    DailyChallenge.countDocuments({ userId: user.id, status: "completed" }),
    calculateDailyStreak(user.id, false),
    calculateDailyStreak(user.id, true),
  ]);

  const bestResult = await DailyChallenge.findOne({
    userId: user.id,
    status: "completed",
  })
    .sort({ elapsedSeconds: 1 })
    .lean();

  return successResponse({
    totalChallenges,
    completedChallenges,
    completionRate: totalChallenges > 0 ? Math.round((completedChallenges / totalChallenges) * 100) : 0,
    currentStreak,
    longestStreak,
    bestTime: (bestResult as any)?.elapsedSeconds || 0,
    bestTimeDate: (bestResult as any)?.date || null,
  });
});

async function calculateDailyStreak(userId: string, longest: boolean): Promise<number> {
  const challenges = await DailyChallenge.find({
    userId,
    status: "completed",
  })
    .sort({ date: -1 })
    .lean();

  if (challenges.length === 0) return 0;

  if (longest) {
    let maxStreak = 1;
    let currentRun = 1;

    for (let i = 1; i < challenges.length; i++) {
      const prev = new Date(challenges[i - 1].date);
      const curr = new Date(challenges[i].date);
      const diffDays = Math.round(
        (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diffDays === 1) {
        currentRun++;
        maxStreak = Math.max(maxStreak, currentRun);
      } else {
        currentRun = 1;
      }
    }

    return maxStreak;
  }

  let streak = 1;
  for (let i = 1; i < challenges.length; i++) {
    const prev = new Date(challenges[i - 1].date);
    const curr = new Date(challenges[i].date);
    const diffDays = Math.round(
      (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
