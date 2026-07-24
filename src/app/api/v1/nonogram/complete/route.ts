import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/server/db';
import { successResponse, errorResponse } from '@/lib/server/utils/apiResponse';
import { auth } from '@/lib/server/middleware/auth';
import { rateLimit } from '@/lib/server/utils/http';
import { sessionService } from '@/lib/server/puzzles/nonogram/services/SessionService';
import { statisticsService } from '@/lib/server/puzzles/nonogram/services/StatisticsService';
import { verificationEngine } from '@/lib/server/puzzles/nonogram/services/VerificationEngine';
import DailyChallenge from '@/lib/server/models/DailyChallenge';

export async function POST(request: NextRequest) {
  if (!rateLimit(request, 'nonogram-complete', 30)) {
    return errorResponse(429, 'rate_limited', 'Too many requests');
  }

  let body: Record<string, unknown> = {};
  try { body = await request.json(); } catch {}

  const { sessionId, grid: rawGrid, elapsedSeconds, hintsUsed, mistakes } = body as {
    sessionId?: string;
    grid?: Array<Array<{ state: string } | string>>;
    elapsedSeconds?: number;
    hintsUsed?: number;
    mistakes?: number;
  };

  const grid = rawGrid?.map(row => row.map(cell => typeof cell === 'string' ? cell : cell.state));

  if (!sessionId) {
    return errorResponse(400, 'validation_error', 'sessionId is required');
  }

  await connectDB();
  const userResult = await auth(request);
  if ('error' in userResult) return userResult.error;

  try {
    const session = await sessionService.getSessionById(sessionId, userResult.user.id);
    const puzzleId = session.puzzleId;
    const difficulty = session.difficulty;

    let result;
    if (grid) {
      result = await verificationEngine.verifyCompletion(puzzleId, grid);
    } else {
      result = {
        isComplete: true,
        totalCellsRequired: 0,
        correctCells: 0,
        incorrectCells: 0,
        accuracy: 100,
        mistakes: 0,
        rowValidation: [],
        columnValidation: [],
      };
    }

    const completionResult = {
      isComplete: result.isComplete,
      accuracy: result.accuracy,
      totalCells: result.totalCellsRequired,
      correctCells: result.correctCells,
    };

    await sessionService.completeSession(sessionId, userResult.user.id, completionResult);

    await statisticsService.updateOnSessionComplete(
      userResult.user.id,
      puzzleId,
      difficulty,
      elapsedSeconds || 0,
      hintsUsed || 0,
      mistakes || 0,
      result.accuracy
    );

    const today = new Date().toISOString().split('T')[0];
    await DailyChallenge.findOneAndUpdate(
      { date: today, userId: userResult.user.id },
      {
        date: today,
        userId: userResult.user.id,
        puzzleId,
        difficulty,
        sessionId,
        status: 'completed',
        completedAt: new Date(),
        elapsedSeconds: elapsedSeconds || 0,
        accuracy: result.accuracy,
        hintsUsed: hintsUsed || 0,
        mistakes: mistakes || 0,
      },
      { upsert: true, new: true }
    );

    return successResponse({
      completed: result.isComplete,
      accuracy: result.accuracy,
      correctCells: result.correctCells,
      totalCellsRequired: result.totalCellsRequired,
      mistakes: result.mistakes,
      elapsedSeconds: elapsedSeconds || 0,
      hintsUsed: hintsUsed || 0,
    });
  } catch (error: any) {
    if (error.message === 'Session not found' || error.message === 'session_not_found') {
      return errorResponse(404, 'session_not_found', error.message);
    }
    if (error.message === 'already_completed' || error.message === 'session_abandoned') {
      return errorResponse(400, 'invalid_state', error.message);
    }
    console.error('[nonogram] complete error:', error);
    return errorResponse(500, 'internal_error', 'Internal Server Error');
  }
}