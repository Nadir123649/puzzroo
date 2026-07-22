import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { auth } from '@/lib/server/middleware/auth';
import { rateLimit } from '@/lib/server/utils/http';
import { sessionService } from '@/lib/server/puzzles/nonogram/services/SessionService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!rateLimit(request, 'nonogram-session-action', 15)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  const { id } = await params;
  await connectDB();
  const userResult = await auth(request);
  if ('error' in userResult) return userResult.error;

  try {
    const session = await sessionService.getSessionById(id, userResult.user.id);
    const replayed = await sessionService.replaySession(userResult.user.id, session.puzzleId, session.difficulty);
    return successResponse({
      sessionId: replayed._id.toString(),
      puzzleId: replayed.puzzleId,
      difficulty: replayed.difficulty,
      status: replayed.status,
      startedAt: replayed.startedAt,
    });
  } catch (error: any) {
    if (error.message === 'Session not found' || error.message === 'session_not_found' || error.message === 'Puzzle not found' || error.message === 'puzzle_not_found') {
      return errorResponse(404, 'not_found', error.message);
    }
    console.error('[nonogram] replay error:', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
}
