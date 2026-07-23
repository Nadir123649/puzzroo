import { NextRequest } from "next/server";
import { withAuth } from "../route-helpers";
import { randomPuzzleEngine } from "@/lib/server/puzzles/nonogram/services/RandomPuzzleEngine";
import { sessionService } from "@/lib/server/puzzles/nonogram/services/SessionService";
import { nonogramToResponse } from "@/lib/server/puzzles/nonogram";
import DailyChallenge from "@/lib/server/models/DailyChallenge";
import NonogramPuzzle from "@/lib/server/models/NonogramPuzzle";
import { dailyQuerySchema } from "@/lib/server/puzzles/nonogram/validators";
import { successResponse } from "@/lib/server/utils/apiResponse";
import { dateToSeed } from "@/lib/server/puzzles/daily";

export const GET = withAuth(async (req, user) => {
  const url = new URL(req.url);
  const parsed = dailyQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  const difficulty = parsed.success ? parsed.data.difficulty : undefined;
  const dateParam = parsed.success ? parsed.data.date : undefined;

  // Past date: deterministic puzzle by date seed, no challenge/session
  if (dateParam) {
    const seed = dateToSeed(dateParam);
    const matchFilter: any = { game: "nonogram", isActive: true };
    if (difficulty) matchFilter.difficulty = difficulty;
    const count = await NonogramPuzzle.countDocuments(matchFilter);
    if (count === 0) {
      return Response.json(
        { success: false, payload: { error: { code: "no_puzzles", message: "No puzzles available" } } },
        { status: 404 }
      );
    }
    const dailyIndex = seed % count;
    const doc = await NonogramPuzzle.findOne({ ...matchFilter, dailyIndex }).lean();
    if (!doc) {
      return Response.json(
        { success: false, payload: { error: { code: "puzzle_not_found", message: "Puzzle not found" } } },
        { status: 404 }
      );
    }
    return successResponse({ ...nonogramToResponse(doc), date: dateParam });
  }

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
      console.error('[nonogram] daily: Failed to create new session:', e.message, e.stack);
      if (e.message !== "puzzle_not_found") {
        throw e;
      }
    }
  }

const puzzleResponse = nonogramToResponse(puzzle);
  return successResponse({
    ...puzzleResponse,
    date: today,
    sessionId: session?._id || challenge.sessionId,
    status: challenge.status,
  });
});
