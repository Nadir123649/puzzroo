import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { auth } from '@/lib/server/middleware/auth';
import { rateLimit } from '@/lib/server/utils/http';
import { replaySession } from '@/lib/server/tangram/services/session.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!rateLimit(request, 'tangram-session-action', 15)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  const { id } = await params;
  await connectDB();
  const userResult = await auth(request);
  if ('error' in userResult) return userResult.error;

  try {
    const session = await replaySession(id, userResult.user.id);
    return successResponse({
      sessionId: session._id.toString(),
      puzzleId: session.puzzleId,
      difficulty: session.difficulty,
      status: session.status,
      pieceStates: session.pieceStates,
      startedAt: session.startedAt,
    });
  } catch (error: any) {
    if (error.message === 'Session not found' || error.message === 'Puzzle not found') {
      return errorResponse(404, 'not_found', error.message);
    }
    console.error('[tangram] replay error:', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
}
