import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { rateLimit } from '@/lib/server/utils/http';
import { sessionService } from '@/lib/server/puzzles/crossmath/services/SessionService';
import { resolveActor } from '../_actor';

export async function GET(request: NextRequest) {
  if (!rateLimit(request, 'crossmath-stats', 30)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  await connectDB();
  const actor = await resolveActor(request);
  if (!actor) return errorResponse(401, 'auth_required', 'Authentication or guest ID required');

  try {
    const stats = await sessionService.getPlayerStats(actor);
    return successResponse(stats);
  } catch (error: any) {
    console.error('[crossmath] stats error:', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
}
