import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { auth } from '@/lib/server/middleware/auth';
import { rateLimit } from '@/lib/server/utils/http';
import DailyChallenge from '@/lib/server/models/DailyChallenge';

export async function GET(request: NextRequest) {
  if (!rateLimit(request, 'nonogram-daily-completion', 30)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const date = params.date as string | undefined;

  await connectDB();
  const userResult = await auth(request);
  if ('error' in userResult) return userResult.error;

  try {
    const today = date || new Date().toISOString().split('T')[0];
    const status = await DailyChallenge.findOne({ date: today, userId: userResult.user.id }).lean();

    return successResponse(
      status || { completed: false }
    );
  } catch (error: any) {
    console.error('[nonogram] daily completion error:', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
}
