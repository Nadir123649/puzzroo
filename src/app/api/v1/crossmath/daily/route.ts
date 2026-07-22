import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { auth } from '@/lib/server/middleware/auth';
import { rateLimit } from '@/lib/server/utils/http';
import { randomPuzzleEngine } from '@/lib/server/puzzles/crossmath/services/RandomPuzzleEngine';

export async function GET(request: NextRequest) {
  if (!rateLimit(request, 'crossmath-daily', 60)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const date = params.date as string | undefined;

  await connectDB();
  const userResult = await auth(request);
  const userId = 'error' in userResult ? null : userResult.user.id;

  try {
    const dateStr = date || new Date().toISOString().split('T')[0];
    const puzzle = await randomPuzzleEngine.selectDailyPuzzle(dateStr);
    const { getPatternById, patternToGameGrid } = await import('@shared/data/crossmath/patterns');
    const pattern = getPatternById(puzzle.patternId);
    const grid = pattern ? patternToGameGrid(pattern) : [];

    return successResponse({
      date: dateStr,
      puzzle: {
        id: puzzle.id,
        difficulty: puzzle.difficulty,
        patternId: puzzle.patternId,
        rows: pattern?.grid_rows || 0,
        columns: pattern?.grid_cols || 0,
        grid,
        availableNumbers: puzzle.availableNumbers || [],
        maxMistakes: puzzle.maxMistakes || 3,
      },
    });
  } catch (error: any) {
    if (error.message === 'no_daily_puzzles_available') {
      return errorResponse(404, 'no_daily_puzzle', 'No daily puzzle available');
    }
    console.error('[crossmath] daily error:', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
}
