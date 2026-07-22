import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { auth } from '@/lib/server/middleware/auth';
import { rateLimit } from '@/lib/server/utils/http';
import { getSessionHistory } from '@/lib/server/tangram/services/session.service';

export async function GET(request: NextRequest) {
  if (!rateLimit(request, 'tangram-history', 30)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const limit = Math.min(parseInt(params.limit || '20'), 100);
  const cursor = params.cursor;

  await connectDB();
  const userResult = await auth(request);
  if ('error' in userResult) return userResult.error;

  try {
    const result = await getSessionHistory(userResult.user.id, limit, cursor);
    return successResponse(result);
  } catch (error: any) {
    console.error('[tangram] history error:', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
}
