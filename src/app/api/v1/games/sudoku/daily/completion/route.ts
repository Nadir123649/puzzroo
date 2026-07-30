import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { rateLimit } from '@/lib/server/utils/http';
import PlaySession from '@/lib/server/models/sudoku/PlaySession';
import DailyChallenge from '@/lib/server/models/sudoku/DailyChallenge';
import { withAuth } from '../../route-helpers';

export const GET = withAuth(async (request: NextRequest, actor, _params) => {
  if (!rateLimit(request, 'sudoku-daily-completion', 30)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  const searchParams = Object.fromEntries(new URL(request.url).searchParams);
  const date = searchParams.date as string | undefined;

  await connectDB();

  try {
    const today = date || new Date().toISOString().split('T')[0];
    const dc = await DailyChallenge.findOne({ date: today }).lean();

    if (!dc || !dc.puzzleId) {
      return successResponse({ completed: false, date: today });
    }

    const ownerFilter: Record<string, unknown> = { puzzleId: String(dc.puzzleId), status: 'completed' };
    if (actor.type === 'guest') {
      ownerFilter.guestId = actor.id;
    } else {
      ownerFilter.userId = actor.id;
    }

    const session = await PlaySession.findOne(ownerFilter).lean();

    return successResponse({
      completed: !!session,
      date: today,
      elapsedSeconds: (session as any)?.elapsedTime || 0,
      hintsUsed: (session as any)?.hintsUsed || 0,
      mistakes: (session as any)?.mistakes || 0,
      score: (session as any)?.score || 0,
    });
  } catch (error: any) {
    console.error('[sudoku/daily/completion]', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
});
