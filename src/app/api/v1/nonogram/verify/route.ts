import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { auth } from '@/lib/server/middleware/auth';
import { rateLimit } from '@/lib/server/utils/http';
import { sessionService } from '@/lib/server/puzzles/nonogram/services/SessionService';
import { verificationEngine } from '@/lib/server/puzzles/nonogram/services/VerificationEngine';

export async function POST(request: NextRequest) {
  if (!rateLimit(request, 'nonogram-verify', 60)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch {}

  const { sessionId, grid: rawGrid } = body as { sessionId?: string; grid?: Array<Array<{ state: string } | string>> };

  if (!sessionId || !rawGrid) {
    return errorResponse(400, 'validation_error', 'sessionId and grid are required');
  }

  const grid = rawGrid.map(row => row.map(cell => typeof cell === 'string' ? cell : cell.state));

  await connectDB();
  const userResult = await auth(request);
  if ('error' in userResult) return userResult.error;

  try {
    const session = await sessionService.getSessionById(sessionId, userResult.user.id);
    const result = await verificationEngine.verifyCompletion(session.puzzleId, grid);

    return successResponse({
      valid: result.isComplete,
      accuracy: result.accuracy,
      correctCells: result.correctCells,
      totalCellsRequired: result.totalCellsRequired,
      mistakes: result.mistakes,
      rowValidation: result.rowValidation,
      columnValidation: result.columnValidation,
    });
  } catch (error: any) {
    if (error.message === 'Session not found' || error.message === 'session_not_found') {
      return errorResponse(404, 'session_not_found', error.message);
    }
    if (error.message === 'Puzzle not found' || error.message === 'puzzle_not_found') {
      return errorResponse(404, 'puzzle_not_found', error.message);
    }
    console.error('[nonogram] verify error:', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
}