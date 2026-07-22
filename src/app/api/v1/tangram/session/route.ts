import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { auth } from '@/lib/server/middleware/auth';
import { validate } from '@/lib/server/middleware/validate';
import { rateLimit } from '@/lib/server/utils/http';
import { startSessionSchema } from '@/lib/server/tangram/validators/session.validator';
import { startSession } from '@/lib/server/tangram/services/session.service';

export async function POST(request: NextRequest) {
  if (!rateLimit(request, 'tangram-session', 30)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch {}

  const val = validate(startSessionSchema, body);
  if (val.error) return val.error;

  await connectDB();
  const userResult = await auth(request);
  if ('error' in userResult) return userResult.error;

  try {
    const session = await startSession(
      userResult.user.id,
      val.data!.puzzleId,
      val.data!.difficulty
    );

    return successResponse({
      sessionId: session._id.toString(),
      puzzleId: session.puzzleId,
      difficulty: session.difficulty,
      status: session.status,
      pieceStates: session.pieceStates,
      startedAt: session.startedAt,
      elapsedSeconds: session.elapsedSeconds,
    });
  } catch (error: any) {
    if (error.message === 'Puzzle not found') {
      return errorResponse(404, 'puzzle_not_found', error.message);
    }
    console.error('[tangram] start session error:', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
}
