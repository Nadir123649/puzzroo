import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { auth } from '@/lib/server/middleware/auth';
import { rateLimit } from '@/lib/server/utils/http';
import { sessionService } from '@/lib/server/puzzles/crossmath/services/SessionService';

export async function POST(request: NextRequest) {
  if (!rateLimit(request, 'crossmath-session', 30)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch {}

  const { puzzleId } = body as { puzzleId?: string };

  if (!puzzleId) {
    return errorResponse(400, 'validation_error', 'puzzleId is required');
  }

  await connectDB();
  const userResult = await auth(request);
  if ('error' in userResult) return userResult.error;

  try {
    const session = await sessionService.startSession(userResult.user.id, puzzleId);
    return successResponse(session);
  } catch (error: any) {
    if (error.message === 'puzzle_not_found') {
      return errorResponse(404, 'puzzle_not_found', error.message);
    }
    console.error('[crossmath] start session error:', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
}
