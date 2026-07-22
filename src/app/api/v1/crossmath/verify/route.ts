import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { auth } from '@/lib/server/middleware/auth';
import { rateLimit } from '@/lib/server/utils/http';
import { sessionService } from '@/lib/server/puzzles/crossmath/services/SessionService';
import { verificationEngine } from '@/lib/server/puzzles/crossmath/services/VerificationEngine';

export async function POST(request: NextRequest) {
  if (!rateLimit(request, 'crossmath-verify', 60)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch {}

  const { sessionId, grid } = body as { sessionId?: string; grid?: Record<string, number> };

  if (!sessionId || !grid) {
    return errorResponse(400, 'validation_error', 'sessionId and grid are required');
  }

  await connectDB();
  const userResult = await auth(request);
  if ('error' in userResult) return userResult.error;

  try {
    const result = await sessionService.verifyGrid(sessionId, userResult.user.id, grid);
    return successResponse(result);
  } catch (error: any) {
    if (error.message === 'session_not_found') {
      return errorResponse(404, 'session_not_found', error.message);
    }
    if (error.message === 'not_owner') {
      return errorResponse(403, 'forbidden', error.message);
    }
    console.error('[crossmath] verify error:', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
}
