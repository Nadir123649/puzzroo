import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { auth } from '@/lib/server/middleware/auth';
import { rateLimit } from '@/lib/server/utils/http';
import DailyChallenge from '@/lib/server/models/DailyChallenge';

export async function GET(request: NextRequest) {
  if (!rateLimit(request, 'crossmath-daily-history', 30)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  await connectDB();
  const userResult = await auth(request);
  if ('error' in userResult) return userResult.error;

  try {
    const history = await DailyChallenge.find({ userId: userResult.user.id })
      .sort({ date: -1 })
      .limit(30)
      .select('date puzzleId difficulty elapsedSeconds accuracy hintsUsed mistakes status')
      .lean();

    return successResponse(history);
  } catch (error: any) {
    console.error('[crossmath] daily history error:', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
}
