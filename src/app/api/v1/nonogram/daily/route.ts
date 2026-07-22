import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { auth } from '@/lib/server/middleware/auth';
import { rateLimit } from '@/lib/server/utils/http';
import { randomPuzzleEngine } from '@/lib/server/puzzles/nonogram/services/RandomPuzzleEngine';
import { sessionService } from '@/lib/server/puzzles/nonogram/services/SessionService';
import { nonogramToResponse } from '@/lib/server/puzzles/nonogram';
import DailyChallenge from '@/lib/server/models/DailyChallenge';

export async function GET(request: NextRequest) {
  if (!rateLimit(request, 'nonogram-daily', 60)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const date = params.date as string | undefined;
  const difficulty = params.difficulty as string | undefined;

  await connectDB();
  const userResult = await auth(request);
  const userId = 'error' in userResult ? null : userResult.user.id;

  try {
    if (!userId) {
      return errorResponse(401, 'unauthorized', 'Authentication required');
    }

    const { puzzle, dailyChallenge } = await randomPuzzleEngine.selectDailyPuzzle(userId, difficulty as any);

    const today = new Date().toISOString().split('T')[0];

    let challenge = dailyChallenge;
    if (!challenge) {
      challenge = await DailyChallenge.create({
        date: today,
        userId,
        puzzleId: puzzle.puzzleId,
        difficulty: puzzle.difficulty,
        status: 'active',
      });
    }

    let session = null;
    if (challenge.sessionId) {
      try {
        session = await sessionService.getSessionById(challenge.sessionId.toString(), userId);
      } catch {}
    }

    if (!session) {
      try {
        session = await sessionService.startSession({
          userId,
          puzzleId: puzzle.puzzleId,
          difficulty: puzzle.difficulty,
        });
        challenge.sessionId = session._id;
        await challenge.save();
      } catch {}
    }

    return successResponse({
      date: today,
      puzzle: nonogramToResponse(puzzle as any),
      sessionId: session?._id?.toString() || challenge.sessionId?.toString(),
      status: challenge.status,
    });
  } catch (error: any) {
    if (error.message === 'no_daily_puzzles_available') {
      return errorResponse(404, 'no_daily_puzzle', 'No daily puzzle available');
    }
    console.error('[nonogram] daily error:', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
}
