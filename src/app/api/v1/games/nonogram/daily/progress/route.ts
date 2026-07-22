import { NextRequest } from "next/server";
import { withAuth } from "../../route-helpers";
import DailyChallenge from "@/lib/server/models/DailyChallenge";
import { successResponse } from "@/lib/server/utils/apiResponse";

export const GET = withAuth(async (req, user) => {
  const today = new Date().toISOString().split("T")[0];

  const challenge = await DailyChallenge.findOne({
    date: today,
    userId: user.id,
  }).lean();

  if (!challenge) {
    return successResponse({
      hasProgress: false,
      message: "No daily challenge progress yet. Fetch today's puzzle first.",
    });
  }

  return successResponse({
    hasProgress: true,
    date: challenge.date,
    puzzleId: challenge.puzzleId,
    difficulty: challenge.difficulty,
    status: challenge.status,
    elapsedSeconds: challenge.elapsedSeconds,
    hintsUsed: challenge.hintsUsed,
    mistakes: challenge.mistakes,
    accuracy: challenge.accuracy,
    completedAt: challenge.completedAt,
  });
});
