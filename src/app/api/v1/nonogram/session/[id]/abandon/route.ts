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
  if (!rateLimit(request, 'nonogram-session-action', 30)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  const { id } = await params;

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch {}

  await connectDB();
  const userResult = await auth(request);
  if ('error' in userResult) return userResult.error;

  try {
    const reason = (body.reason as string) || undefined;
    const session = await sessionService.abandonSession(id, userResult.user.id, reason);
    return successResponse({
      sessionId: session._id.toString(),
      status: session.status,
      abandonReason: session.abandonReason,
    });
  } catch (error: any) {
    if (error.message === 'Session not found' || error.message === 'session_not_found') {
      return errorResponse(404, 'session_not_found', error.message);
    }
    return errorResponse(400, 'invalid_state', error.message);
  }
}
