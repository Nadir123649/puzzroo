import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { auth } from '@/lib/server/middleware/auth';
import { rateLimit } from '@/lib/server/utils/http';
import { getDailyPuzzle } from '@/lib/server/tangram/services/daily.service';
import { tangramToResponse } from '@/lib/server/puzzles/tangram';

export async function GET(request: NextRequest) {
  if (!rateLimit(request, 'tangram-daily', 60)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const date = params.date as string | undefined;

  await connectDB();
  const userResult = await auth(request);
  const userId = 'error' in userResult ? null : userResult.user.id;

  try {
    const result = await getDailyPuzzle(userId, date);
    if (!result || !result.puzzle) {
      return errorResponse(404, 'no_daily_puzzle', 'No daily puzzle available');
    }

    return successResponse({
      puzzle: tangramToResponse(result.puzzle),
      dailyStatus: result.dailyStatus,
      date: date || new Date().toISOString().split('T')[0],
    });
  } catch (error: any) {
    console.error('[tangram] daily error:', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
}
