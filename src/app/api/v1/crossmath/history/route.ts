import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { rateLimit } from '@/lib/server/utils/http';
import { sessionService } from '@/lib/server/puzzles/crossmath/services/SessionService';
import { resolveActor } from '../_actor';

export async function GET(request: NextRequest) {
  if (!rateLimit(request, 'crossmath-history', 30)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const limit = Math.min(parseInt(params.limit || '20'), 100);
  const difficulty = params.difficulty as string | undefined;
  const status = params.status as string | undefined;

  await connectDB();
  const actor = await resolveActor(request);
  if (!actor) return errorResponse(401, 'auth_required', 'Authentication or guest ID required');

  try {
    const result = await sessionService.getSessionHistory(actor, {
      limit,
      difficulty,
      status,
    });
    return successResponse(result);
  } catch (error: any) {
    console.error('[crossmath] history error:', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
}
