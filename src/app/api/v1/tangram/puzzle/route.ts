import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { auth } from '@/lib/server/middleware/auth';
import { rateLimit } from '@/lib/server/utils/http';
import { getRandomPuzzle } from '@/lib/server/tangram/services/puzzle.service';
import { tangramToResponse } from '@/lib/server/puzzles/tangram';

export async function GET(request: NextRequest) {
  if (!rateLimit(request, 'tangram-puzzle', 60)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const difficulty = params.difficulty as string | undefined;

  await connectDB();
  const userResult = await auth(request);
  const userId = 'error' in userResult ? null : userResult.user.id;

  try {
    const puzzle = await getRandomPuzzle(userId, {
      difficulty,
    });

    if (!puzzle) {
      return errorResponse(404, 'no_puzzle', 'No tangram puzzles available');
    }

    const response = tangramToResponse(puzzle);
    return successResponse(response);
  } catch (error: any) {
    console.error('[tangram] puzzle error:', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
}
