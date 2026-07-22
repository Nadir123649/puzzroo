import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { auth } from '@/lib/server/middleware/auth';
import { rateLimit } from '@/lib/server/utils/http';
import { getDailyCompletionStatus } from '@/lib/server/tangram/services/daily.service';

export async function GET(request: NextRequest) {
  if (!rateLimit(request, 'tangram-daily-completion', 30)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const date = params.date as string | undefined;

  await connectDB();
  const userResult = await auth(request);
  if ('error' in userResult) return userResult.error;

  try {
    const status = await getDailyCompletionStatus(userResult.user.id, date);
    return successResponse(
      status || { completed: false }
    );
  } catch (error: any) {
    console.error('[tangram] daily completion error:', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
}
