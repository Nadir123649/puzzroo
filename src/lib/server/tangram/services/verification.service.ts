import PlaySession from '../../models/PlaySession';
import { verifyPuzzleSolution } from '../geometry/engine';
import type { TangramPieceState } from '../types';

export async function verifySession(
  sessionId: string,
  userId: string,
  pieceStates: TangramPieceState[]
) {
  const session = await PlaySession.findOne({
    _id: sessionId,
    userId,
    gameId: 'tangram',
  });

  if (!session) throw new Error('Session not found');
  if (session.status === 'completed') throw new Error('Session already completed');
  if (session.status === 'abandoned') throw new Error('Session abandoned');

  const result = await verifyPuzzleSolution({
    puzzleId: session.puzzleId,
    pieceStates,
  });

  return result;
}

export async function completeSession(
  sessionId: string,
  userId: string,
  pieceStates: TangramPieceState[],
  elapsedSeconds: number,
  hintsUsed?: number,
  mistakes?: number
) {
  const session = await PlaySession.findOne({
    _id: sessionId,
    userId,
    gameId: 'tangram',
  });

  if (!session) throw new Error('Session not found');
  if (session.status === 'completed') throw new Error('Session already completed');
  if (session.status === 'abandoned') throw new Error('Session abandoned');

  const result = await verifyPuzzleSolution({
    puzzleId: session.puzzleId,
    pieceStates,
  });

  if (!result.valid) {
    return { success: false, result };
  }

  session.status = 'completed';
  session.pieceStates = pieceStates;
  session.elapsedSeconds = elapsedSeconds;
  session.completedAt = new Date();
  session.lastSaveAt = new Date();

  if (hintsUsed !== undefined) session.hintsUsed = hintsUsed;
  if (mistakes !== undefined) session.mistakes = mistakes;

  session.completionResult = {
    isCorrect: true,
    accuracy: result.accuracy,
    piecesCorrect: result.piecesCorrect,
    totalPieces: result.totalPieces,
  };

  await session.save();

  return { success: true, result, session };
}
