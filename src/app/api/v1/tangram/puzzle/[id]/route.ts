import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { rateLimit } from '@/lib/server/utils/http';
import { getPuzzleById } from '@/lib/server/tangram/services/puzzle.service';
import { tangramToResponse } from '@/lib/server/puzzles/tangram';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!rateLimit(_request, 'tangram-puzzle-id', 120)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  const { id } = await params;
  await connectDB();

  try {
    const puzzle = await getPuzzleById(id);
    if (!puzzle) {
      return errorResponse(404, 'puzzle_not_found', 'Puzzle not found');
    }

    return successResponse(tangramToResponse(puzzle));
  } catch (error: any) {
    console.error('[tangram] puzzle by id error:', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
}
