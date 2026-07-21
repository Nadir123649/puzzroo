import { NextRequest } from "next/server";
import { withAuth } from "../route-helpers";
import { randomPuzzleEngine } from "@/lib/server/puzzles/nonogram/services/RandomPuzzleEngine";
import { sessionService } from "@/lib/server/puzzles/nonogram/services/SessionService";
import DailyChallenge from "@/lib/server/models/DailyChallenge";
import { dailyQuerySchema } from "@/lib/server/puzzles/nonogram/validators";
import { successResponse } from "@/lib/server/utils/apiResponse";

export const GET = withAuth(async (req, user) => {
  const url = new URL(req.url);
  const parsed = dailyQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  const difficulty = parsed.success ? parsed.data.difficulty : undefined;

  const { puzzle, dailyChallenge } = await randomPuzzleEngine.selectDailyPuzzle(user.id, difficulty);

  const today = new Date().toISOString().split("T")[0];

  let challenge = dailyChallenge;
  if (!challenge) {
    challenge = await DailyChallenge.create({
      date: today,
      userId: user.id,
      puzzleId: puzzle.puzzleId,
      difficulty: puzzle.difficulty,
      status: "active",
    });
  }

  const existingSession = challenge.sessionId
    ? await sessionService.getSessionById(challenge.sessionId.toString(), user.id).catch(() => null)
    : null;

  let session = existingSession;
  if (!session) {
    try {
      session = await sessionService.startSession({
        userId: user.id,
        puzzleId: puzzle.puzzleId,
        difficulty: puzzle.difficulty,
      });
      challenge.sessionId = session._id;
      await challenge.save();
    } catch (e: any) {
      if (e.message !== "puzzle_not_found") throw e;
    }
  }

  return successResponse({
    date: today,
    puzzle: {
      id: puzzle.puzzleId,
      title: puzzle.title,
      difficulty: puzzle.difficulty,
      size: puzzle.size,
      category: puzzle.category,
      estimatedTime: puzzle.estimatedTime,
      rowClues: (puzzle.rowClues as number[][]).map((values) => ({ values })),
      columnClues: (puzzle.columnClues as number[][]).map((values) => ({ values })),
    },
    sessionId: session?._id || challenge.sessionId,
    status: challenge.status,
  });
});
