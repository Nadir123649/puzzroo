import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { auth } from '@/lib/server/middleware/auth';
import { rateLimit } from '@/lib/server/utils/http';
import { getPlayerStats } from '@/lib/server/tangram/services/statistics.service';

export async function GET(request: NextRequest) {
  if (!rateLimit(request, 'tangram-stats', 30)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  await connectDB();
  const userResult = await auth(request);
  if ('error' in userResult) return userResult.error;

  try {
    const stats = await getPlayerStats(userResult.user.id);
    return successResponse(stats);
  } catch (error: any) {
    console.error('[tangram] stats error:', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
}
