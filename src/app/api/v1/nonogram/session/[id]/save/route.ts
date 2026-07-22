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
  if (!rateLimit(request, 'nonogram-session-save', 60)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  const { id } = await params;

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch {}

  const { grid, elapsedSeconds, hintsUsed, mistakes } = body as {
    grid?: Array<Array<{ state: string }>>;
    elapsedSeconds?: number;
    hintsUsed?: number;
    mistakes?: number;
  };

  if (!grid || elapsedSeconds === undefined) {
    return errorResponse(400, 'validation_error', 'grid and elapsedSeconds are required');
  }

  await connectDB();
  const userResult = await auth(request);
  if ('error' in userResult) return userResult.error;

  try {
    const session = await sessionService.saveProgress(id, userResult.user.id, {
      grid,
      elapsedSeconds,
      hintsUsed,
      mistakes,
    });

    return successResponse({
      sessionId: session._id.toString(),
      status: session.status,
      lastSaveAt: session.lastSaveAt,
      elapsedSeconds: session.elapsedSeconds,
    });
  } catch (error: any) {
    if (error.message === 'Session not found' || error.message === 'session_not_found') {
      return errorResponse(404, 'session_not_found', error.message);
    }
    console.error('[nonogram] save error:', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
}
