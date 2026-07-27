import PlaySession from '../../models/PlaySession';
import TangramPuzzle from '../../models/TangramPuzzle';
import UserStatistics from '../../models/UserStatistics';
import type { TangramPieceState } from '../types';

export async function startSession(
  userId: string,
  puzzleId: string,
  difficulty: "easy" | "medium" | "hard"
): Promise<any> {
  const puzzle = await TangramPuzzle.findOne({ puzzleId }).lean();
  if (!puzzle) {
    throw new Error('Puzzle not found');
  }

  const activeSession = await PlaySession.findOne({
    userId,
    puzzleId,
    gameId: 'tangram',
    status: 'active',
  });

  if (activeSession) {
    if (!(activeSession as any).pieceStates || (activeSession as any).pieceStates.length === 0) {
      const pieceShapeIds = puzzle.pieceShapeIds as string[];
      (activeSession as any).pieceStates = pieceShapeIds.map(
        (pieceId: string) => ({
          pieceId: pieceId as any,
          position: { x: 0, y: 0 },
          rotation: 0,
          flipped: false,
          placed: false,
        })
      );
      await activeSession.save();
    }
    return activeSession;
  }

  const pieceShapeIds = puzzle.pieceShapeIds as string[];
  const initialPieceStates: TangramPieceState[] = pieceShapeIds.map(
    (pieceId: string) => ({
      pieceId: pieceId as TangramPieceState['pieceId'],
      position: { x: 0, y: 0 },
      rotation: 0,
      flipped: false,
      placed: false,
    })
  );

  const session = await PlaySession.create({
    userId,
    puzzleId,
    gameId: 'tangram',
    difficulty: difficulty as "easy" | "medium" | "hard",
    status: 'active',
    pieceStates: initialPieceStates,
    startedAt: new Date(),
    elapsedSeconds: 0,
    hintsUsed: 0,
    hints: [],
    mistakes: 0,
    restartCount: 0,
    replayCount: 0,
  });

  await UserStatistics.findOneAndUpdate(
    { userId, gameId: 'tangram' },
    {
      $inc: { totalPlayed: 1 },
      $set: { lastPlayedAt: new Date() },
    },
    { upsert: true }
  );

  return session;
}

export async function pauseSession(sessionId: string, userId: string) {
  const session = await PlaySession.findOne({
    _id: sessionId,
    userId,
    gameId: 'tangram',
  });

  if (!session) throw new Error('Session not found');
  if (session.status !== 'active') throw new Error('Session is not active');

  session.status = 'paused';
  session.pausedAt = new Date();
  session.pausedState = {
    pieceStates: session.pieceStates,
    elapsedSeconds: session.elapsedSeconds,
    hintsUsed: session.hintsUsed,
  };
  await session.save();

  return session;
}

export async function resumeSession(sessionId: string, userId: string) {
  const session = await PlaySession.findOne({
    _id: sessionId,
    userId,
    gameId: 'tangram',
  });

  if (!session) throw new Error('Session not found');
  if (session.status !== 'paused') throw new Error('Session is not paused');

  session.status = 'active';
  session.resumedAt = new Date();
  session.pausedAt = null;
  session.pausedState = null;
  await session.save();

  return session;
}

export async function saveProgress(
  sessionId: string,
  userId: string,
  data: {
    pieceStates: TangramPieceState[];
    elapsedSeconds: number;
    hintsUsed?: number;
    mistakes?: number;
  }
) {
  const session = await PlaySession.findOne({
    _id: sessionId,
    userId,
    gameId: 'tangram',
    status: { $in: ['active', 'paused'] },
  });

  if (!session) throw new Error('Active session not found');

  (session as any).pieceStates = data.pieceStates;
  session.elapsedSeconds = data.elapsedSeconds;
  session.lastSaveAt = new Date();

  if (data.hintsUsed !== undefined) session.hintsUsed = data.hintsUsed;
  if (data.mistakes !== undefined) session.mistakes = data.mistakes;

  await session.save();
  return session;
}

export async function restartSession(sessionId: string, userId: string) {
  const session = await PlaySession.findOne({
    _id: sessionId,
    userId,
    gameId: 'tangram',
  });

  if (!session) throw new Error('Session not found');

  const puzzle = await TangramPuzzle.findOne({
    puzzleId: session.puzzleId,
  }).lean();
  if (!puzzle) throw new Error('Puzzle not found');

  const pieceShapeIds = puzzle.pieceShapeIds as string[];
  const initialPieceStates: TangramPieceState[] = pieceShapeIds.map(
    (pieceId: string) => ({
      pieceId: pieceId as TangramPieceState['pieceId'],
      position: { x: 0, y: 0 },
      rotation: 0,
      flipped: false,
      placed: false,
    })
  );

  session.pieceStates = initialPieceStates as any;
  session.elapsedSeconds = 0;
  session.hintsUsed = 0;
  session.hints = [];
  session.mistakes = 0;
  session.status = 'active';
  session.restartCount = (session.restartCount || 0) + 1;
  session.startedAt = new Date();
  session.pausedAt = null;
  session.pausedState = null;
  session.completionResult = {
    isCorrect: false,
    accuracy: 0,
    piecesCorrect: 0,
    totalPieces: 7,
  };
  await session.save();

  return session;
}

export async function replaySession(
  originalSessionId: string,
  userId: string
) {
  const original = await PlaySession.findOne({
    _id: originalSessionId,
    userId,
    gameId: 'tangram',
  });

  if (!original) throw new Error('Session not found');

  const puzzle = await TangramPuzzle.findOne({
    puzzleId: original.puzzleId,
  }).lean();
  if (!puzzle) throw new Error('Puzzle not found');

  const pieceShapeIds = puzzle.pieceShapeIds as string[];
  const initialPieceStates: TangramPieceState[] = pieceShapeIds.map(
    (pieceId: string) => ({
      pieceId: pieceId as TangramPieceState['pieceId'],
      position: { x: 0, y: 0 },
      rotation: 0,
      flipped: false,
      placed: false,
    })
  );

  original.replayCount = (original.replayCount || 0) + 1;
  await original.save();

  const newSession = await PlaySession.create({
    userId,
    puzzleId: original.puzzleId,
    gameId: 'tangram',
    difficulty: difficulty as "easy" | "medium" | "hard",
    status: 'active',
    pieceStates: initialPieceStates as any,
    startedAt: new Date(),
    elapsedSeconds: 0,
    replayCount: 1,
  });

  return newSession;
}

export async function abandonSession(
  sessionId: string,
  userId: string,
  reason?: string
) {
  const session = await PlaySession.findOne({
    _id: sessionId,
    userId,
    gameId: 'tangram',
  });

  if (!session) throw new Error('Session not found');
  if (session.status === 'completed') throw new Error('Session already completed');
  if (session.status === 'abandoned') throw new Error('Session already abandoned');

  session.status = 'abandoned';
  session.abandonReason = reason || 'user_abandoned';
  await session.save();

  await UserStatistics.findOneAndUpdate(
    { userId, gameId: 'tangram' },
    { $inc: { totalAbandoned: 1 } },
    { upsert: true }
  );

  return session;
}

export async function getSessionHistory(
  userId: string,
  limit = 20,
  cursor?: string
) {
  const filter: Record<string, unknown> = {
    userId,
    gameId: 'tangram',
  };

  if (cursor) {
    filter._id = { $lt: cursor };
  }

  const sessions = await PlaySession.find(filter)
    .sort({ updatedAt: -1 })
    .limit(limit)
    .select('puzzleId difficulty status elapsedSeconds hintsUsed mistakes restartCount replayCount startedAt completedAt updatedAt completionResult')
    .lean();

  const nextCursor =
    sessions.length === limit
      ? sessions[sessions.length - 1]._id.toString()
      : null;

  return { items: sessions, nextCursor };
}

export async function getRecentSessions(userId: string, limit = 5) {
  return PlaySession.find({ userId, gameId: 'tangram' })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .select('puzzleId difficulty status elapsedSeconds updatedAt')
    .lean();
}

export async function getCompletedPuzzles(userId: string) {
  return PlaySession.find({
    userId,
    gameId: 'tangram',
    status: 'completed',
  })
    .sort({ completedAt: -1 })
    .select('puzzleId difficulty elapsedSeconds hintsUsed mistakes completedAt')
    .lean();
}
