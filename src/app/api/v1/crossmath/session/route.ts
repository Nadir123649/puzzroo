import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { rateLimit } from '@/lib/server/utils/http';
import { sessionService } from '@/lib/server/puzzles/crossmath/services/SessionService';
import { resolveActor } from '../_actor';

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

  const actor = await resolveActor(request);
  if (!actor) return errorResponse(401, 'auth_required', 'Authentication or guest ID required');

  try {
    const session = await sessionService.startSession(actor, puzzleId);
    return successResponse(session);
  } catch (error: any) {
    if (error.message === 'puzzle_not_found') {
      return errorResponse(404, 'puzzle_not_found', error.message);
    }
    console.error('[crossmath] start session error:', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
}
