import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { auth } from '@/lib/server/middleware/auth';
import { rateLimit } from '@/lib/server/utils/http';
import { resumeSession } from '@/lib/server/tangram/services/session.service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!rateLimit(request, 'tangram-session-action', 30)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  const { id } = await params;
  await connectDB();
  const userResult = await auth(request);
  if ('error' in userResult) return userResult.error;

  try {
    const session = await resumeSession(id, userResult.user.id);
    return successResponse({
      sessionId: session._id.toString(),
      status: session.status,
      pieceStates: session.pieceStates,
      elapsedSeconds: session.elapsedSeconds,
      hintsUsed: session.hintsUsed,
    });
  } catch (error: any) {
    if (error.message === 'Session not found') {
      return errorResponse(404, 'session_not_found', error.message);
    }
    return errorResponse(400, 'invalid_state', error.message);
  }
}
