import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { auth } from '@/lib/server/middleware/auth';
import { validate } from '@/lib/server/middleware/validate';
import { rateLimit } from '@/lib/server/utils/http';
import { completeRequestSchema } from '@/lib/server/tangram/validators/verification.validator';
import { completeSession } from '@/lib/server/tangram/services/verification.service';
import { updatePlayerStatsAfterCompletion, updatePuzzleStats } from '@/lib/server/tangram/services/statistics.service';
import { updateDailyChallenge } from '@/lib/server/tangram/services/daily.service';
import { trackServer } from '@/lib/server/utils/trackEvent';

export async function POST(request: NextRequest) {
  if (!rateLimit(request, 'tangram-complete', 30)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch {}

  const val = validate(completeRequestSchema, body);
  if (val.error) return val.error;

  await connectDB();
  const userResult = await auth(request);
  if ('error' in userResult) return userResult.error;

  try {
    const { sessionId, pieceStates, elapsedSeconds, hintsUsed, mistakes } = val.data!;
    const result = await completeSession(
      sessionId,
      userResult.user.id,
      pieceStates,
      elapsedSeconds,
      hintsUsed || 0,
      mistakes || 0
    );

    if (!result.success) {
      return successResponse({
        completed: false,
        accuracy: result.result.accuracy,
        piecesCorrect: result.result.piecesCorrect,
        totalPieces: result.result.totalPieces,
        errors: result.result.errors,
      });
    }

    const session = result.session!;

    await updatePlayerStatsAfterCompletion(
      userResult.user.id,
      session.difficulty,
      elapsedSeconds,
      result.result.accuracy,
      hintsUsed || 0,
      mistakes || 0
    );

    await updatePuzzleStats(
      session.puzzleId,
      session.difficulty,
      elapsedSeconds,
      result.result.accuracy,
      true
    );

    await updateDailyChallenge(
      userResult.user.id,
      session.puzzleId,
      session.difficulty,
      sessionId,
      elapsedSeconds,
      result.result.accuracy,
      hintsUsed || 0,
      mistakes || 0
    );

    await trackServer({
      userId: userResult.user.id,
      event: 'tangram_completed',
      properties: {
        puzzleId: session.puzzleId,
        difficulty: session.difficulty,
        elapsedSeconds,
        accuracy: result.result.accuracy,
        hintsUsed: hintsUsed || 0,
        mistakes: mistakes || 0,
      },
      request,
    });

    return successResponse({
      completed: true,
      accuracy: result.result.accuracy,
      piecesCorrect: result.result.piecesCorrect,
      totalPieces: result.result.totalPieces,
      elapsedSeconds,
      hintsUsed: hintsUsed || 0,
      mistakes: mistakes || 0,
    });
  } catch (error: any) {
    if (error.message === 'Session not found') {
      return errorResponse(404, 'session_not_found', error.message);
    }
    if (error.message.includes('already') || error.message.includes('abandoned')) {
      return errorResponse(400, 'invalid_state', error.message);
    }
    console.error('[tangram] complete error:', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
}
