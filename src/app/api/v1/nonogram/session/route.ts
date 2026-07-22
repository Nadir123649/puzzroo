import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { auth } from '@/lib/server/middleware/auth';
import { rateLimit } from '@/lib/server/utils/http';
import { sessionService } from '@/lib/server/puzzles/nonogram/services/SessionService';

export async function POST(request: NextRequest) {
  if (!rateLimit(request, 'nonogram-session', 30)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch {}

  const { puzzleId, difficulty } = body as { puzzleId?: string; difficulty?: string };

  if (!puzzleId || !difficulty) {
    return errorResponse(400, 'validation_error', 'puzzleId and difficulty are required');
  }

  await connectDB();
  const userResult = await auth(request);
  if ('error' in userResult) return userResult.error;

  try {
    const session = await sessionService.startSession({
      userId: userResult.user.id,
      puzzleId,
      difficulty,
    });

    return successResponse({
      sessionId: session._id.toString(),
      puzzleId: session.puzzleId,
      difficulty: session.difficulty,
      status: session.status,
      startedAt: session.startedAt,
    });
  } catch (error: any) {
    if (error.message === 'puzzle_not_found') {
      return errorResponse(404, 'puzzle_not_found', error.message);
    }
    console.error('[nonogram] start session error:', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
}
