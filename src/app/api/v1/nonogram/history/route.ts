import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { auth } from '@/lib/server/middleware/auth';
import { rateLimit } from '@/lib/server/utils/http';
import PlaySession from '@/lib/server/models/PlaySession';

export async function GET(request: NextRequest) {
  if (!rateLimit(request, 'nonogram-history', 30)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const limit = Math.min(parseInt(params.limit || '20'), 100);
  const cursor = params.cursor;

  await connectDB();
  const userResult = await auth(request);
  if ('error' in userResult) return userResult.error;

  try {
    const filter: any = { userId: userResult.user.id };
    if (cursor) {
      filter._id = { $lt: cursor };
    }

    const sessions = await PlaySession.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = sessions.length > limit;
    const items = hasMore ? sessions.slice(0, limit) : sessions;
    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1]._id.toString() : null;

    const results = items.map((s: any) => ({
      sessionId: s._id.toString(),
      puzzleId: s.puzzleId,
      difficulty: s.difficulty,
      status: s.status,
      elapsedSeconds: s.elapsedSeconds,
      hintsUsed: s.hintsUsed,
      mistakes: s.mistakes,
      accuracy: s.completionResult?.accuracy || 0,
      startedAt: s.startedAt,
      completedAt: s.completedAt,
    }));

    return successResponse({ items: results, nextCursor });
  } catch (error: any) {
    console.error('[nonogram] history error:', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
}
