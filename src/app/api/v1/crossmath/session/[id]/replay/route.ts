import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { auth } from '@/lib/server/middleware/auth';
import { rateLimit } from '@/lib/server/utils/http';
import { sessionService } from '@/lib/server/puzzles/crossmath/services/SessionService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!rateLimit(request, 'crossmath-session-action', 15)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  const { id } = await params;
  await connectDB();
  const userResult = await auth(request);
  if ('error' in userResult) return userResult.error;

  try {
    const session = await sessionService.getSession(id, userResult.user.id);
    const replayed = await sessionService.replaySession(userResult.user.id, session.puzzleId);
    return successResponse(replayed);
  } catch (error: any) {
    if (error.message === 'session_not_found' || error.message === 'puzzle_not_found') {
      return errorResponse(404, 'not_found', error.message);
    }
    if (error.message === 'not_owner') {
      return errorResponse(403, 'forbidden', error.message);
    }
    console.error('[crossmath] replay error:', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
}
