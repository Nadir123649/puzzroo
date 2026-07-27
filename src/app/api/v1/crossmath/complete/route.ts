import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { auth } from '@/lib/server/middleware/auth';
import { rateLimit } from '@/lib/server/utils/http';
import { sessionService } from '@/lib/server/puzzles/crossmath/services/SessionService';
import { statisticsService } from '@/lib/server/puzzles/crossmath/services/StatisticsService';
import DailyChallenge from '@/lib/server/models/DailyChallenge';

export async function POST(request: NextRequest) {
  if (!rateLimit(request, 'crossmath-complete', 30)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch {}

  const { sessionId, grid, elapsedSeconds, hintsUsed, mistakes, moves, score } = body as {
    sessionId?: string;
    grid?: Record<string, number>;
    elapsedSeconds?: number;
    hintsUsed?: number;
    mistakes?: number;
    moves?: number;
    score?: number;
  };

  if (!sessionId) {
    return errorResponse(400, 'validation_error', 'sessionId is required');
  }

  await connectDB();
  const userResult = await auth(request);
  if ('error' in userResult) return userResult.error;

  try {
    const result = await sessionService.completeSession(
      sessionId,
      userResult.user.id,
      grid || {},
      elapsedSeconds || 0,
      hintsUsed || 0,
      mistakes || 0,
      moves || 0,
      score || 0
    );

    if (result.isCompleted && result.result) {
      statisticsService.updateOnSessionComplete(
        userResult.user.id,
        result.result.puzzleId,
        result.result.difficulty,
        result.result.elapsedTime,
        result.result.hintsUsed,
        result.result.mistakes,
        result.result.accuracy
      ).catch(err => console.error('[crossmath] stats update failed', err));

      const today = new Date().toISOString().split('T')[0];
      await DailyChallenge.findOneAndUpdate(
        { date: today, userId: userResult.user.id },
        {
          date: today,
          userId: userResult.user.id,
          puzzleId: result.result.puzzleId,
          difficulty: result.result.difficulty,
          sessionId,
          status: 'completed',
          completedAt: new Date(),
          elapsedSeconds: result.result.elapsedTime,
          accuracy: result.result.accuracy,
          hintsUsed: result.result.hintsUsed,
          mistakes: result.result.mistakes,
        },
        { upsert: true, new: true }
      );

      return successResponse(result);
    }

    return successResponse(result);
  } catch (error: any) {
    if (error.message === 'session_not_found') {
      return errorResponse(404, 'session_not_found', error.message);
    }
    if (error.message === 'not_owner') {
      return errorResponse(403, 'forbidden', error.message);
    }
    if (error.message === 'already_completed' || error.message === 'session_abandoned') {
      return errorResponse(400, 'invalid_state', error.message);
    }
    console.error('[crossmath] complete error:', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
}
