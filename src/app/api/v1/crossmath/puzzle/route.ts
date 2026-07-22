import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { auth } from '@/lib/server/middleware/auth';
import { rateLimit } from '@/lib/server/utils/http';
import { randomPuzzleEngine } from '@/lib/server/puzzles/crossmath/services/RandomPuzzleEngine';

export async function GET(request: NextRequest) {
  if (!rateLimit(request, 'crossmath-puzzle', 60)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const difficulty = params.difficulty as string | undefined;

  await connectDB();

  // Auth-optional: use user ID if available, otherwise anonymous
  let userId = "anonymous"
  const userResult = await auth(request);
  if (!("error" in userResult)) {
    userId = userResult.user.id;
  }

  try {
    const puzzle = await randomPuzzleEngine.selectPuzzleForPlayer({
      userId,
      difficulty: difficulty as any,
    });

    const { getPatternById, patternToGameGrid } = await import('@shared/data/crossmath/patterns');
    const pattern = getPatternById(puzzle.patternId);
    const grid = pattern ? patternToGameGrid(pattern) : [];

    // Apply blanks and solution values
    const blankSet = new Set(puzzle.blanks || [])
    const solution = puzzle.solution || {}
    for (const pc of pattern?.cells || []) {
      if (pc.type === "NUMBER") {
        const key = `${pc.row}-${pc.col}`
        const cell = grid[pc.row]?.[pc.col]
        if (!cell) continue
        if (blankSet.has(key)) {
          cell.isEditable = true
          cell.type = "empty"
          cell.value = undefined
        } else {
          cell.value = solution[key]
          cell.type = "number"
          cell.isEditable = false
        }
      }
    }

    const response = {
      id: puzzle.id,
      difficulty: puzzle.difficulty,
      patternId: puzzle.patternId,
      rows: puzzle.rows,
      columns: puzzle.columns,
      grid,
      availableNumbers: puzzle.availableNumbers,
      maxMistakes: puzzle.maxMistakes,
      solution: puzzle.solution || {},
    };

    return successResponse(response);
  } catch (error: any) {
    if (error.message === 'no_puzzles_available') {
      return errorResponse(404, 'no_puzzle', 'No crossmath puzzles available');
    }
    console.error('[crossmath] puzzle error:', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
}
