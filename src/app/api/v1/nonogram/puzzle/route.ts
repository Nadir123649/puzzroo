import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { auth } from '@/lib/server/middleware/auth';
import { rateLimit } from '@/lib/server/utils/http';
import { randomPuzzleEngine } from '@/lib/server/puzzles/nonogram/services/RandomPuzzleEngine';
import { nonogramToResponse } from '@/lib/server/puzzles/nonogram';

export async function GET(request: NextRequest) {
  if (!rateLimit(request, 'nonogram-puzzle', 60)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const difficulty = params.difficulty as string | undefined;

  await connectDB();
  const userResult = await auth(request);
  const userId = 'error' in userResult ? null : userResult.user.id;

  try {
    const puzzle = await randomPuzzleEngine.selectRandom({
      userId: userId || '',
      difficulty: difficulty as any,
    });

    if (!puzzle) {
      return errorResponse(404, 'no_puzzle', 'No nonogram puzzles available');
    }

    const response = nonogramToResponse(puzzle as any);
    return successResponse(response);
  } catch (error: any) {
    if (error.message === 'no_puzzles_available') {
      return errorResponse(404, 'no_puzzle', 'No nonogram puzzles available');
    }
    console.error('[nonogram] puzzle error:', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
}