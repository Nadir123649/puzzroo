import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { auth } from '@/lib/server/middleware/auth';
import { rateLimit } from '@/lib/server/utils/http';
import { getDailyHistory } from '@/lib/server/tangram/services/daily.service';

export async function GET(request: NextRequest) {
  if (!rateLimit(request, 'tangram-daily-history', 30)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  await connectDB();
  const userResult = await auth(request);
  if ('error' in userResult) return userResult.error;

  try {
    const history = await getDailyHistory(userResult.user.id);
    return successResponse(history);
  } catch (error: any) {
    console.error('[tangram] daily history error:', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
}
