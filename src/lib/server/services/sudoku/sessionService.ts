import { connectDB } from "@/lib/server/db";
import SudokuPuzzle from "@/lib/server/models/SudokuPuzzle";
import PlaySession from "@/lib/server/models/sudoku/PlaySession";
import type {
  SessionStatus,
  SessionResult,
  SessionResponse,
  SaveProgressInput,
  MistakeRecord,
  MoveRecord,
} from "./types";
import { encode81, decode81, cloneBoard, createEmptyNotes } from "./utils";

function toSessionResponse(doc: any): SessionResponse {
  return {
    id: String(doc._id),
    puzzleId: String(doc.puzzleId),
    difficulty: doc.difficulty || "medium",
    status: doc.status as SessionStatus,
    currentBoard: doc.currentBoard,
    initialBoard: doc.initialBoard,
    notes: doc.notes || createEmptyNotes(),
    elapsedTime: doc.elapsedTime || 0,
    hintsUsed: doc.hintsUsed || 0,
    mistakes: (doc.mistakes || []) as MistakeRecord[],
    result: (doc.result || "incomplete") as SessionResult,
    score: doc.score || 0,
    restartCount: doc.restartCount || 0,
    startedAt: doc.startedAt?.toISOString?.() || new Date().toISOString(),
    pausedAt: doc.pausedAt?.toISOString?.() || null,
    lastSavedAt: doc.lastSavedAt?.toISOString?.() || new Date().toISOString(),
  };
}

export async function createSession(userId: string, puzzleId: string) {
  await connectDB();

  const existing = await PlaySession.findOne({
    userId,
    puzzleId,
    status: { $in: ["playing", "paused"] },
  }).lean();

  if (existing) {
    return toSessionResponse(existing);
  }

  const puzzle = await SudokuPuzzle.findById(puzzleId).lean();
  if (!puzzle) return null;

  const session = await PlaySession.create({
    userId,
    puzzleId,
    difficulty: puzzle.difficulty,
    currentBoard: puzzle.puzzle,
    initialBoard: puzzle.puzzle,
    notes: createEmptyNotes(),
    status: "playing",
    startedAt: new Date(),
    lastSavedAt: new Date(),
  });

  return toSessionResponse(session);
}

export async function getSession(sessionId: string, userId: string) {
  await connectDB();
  const session = await PlaySession.findOne({ _id: sessionId, userId }).lean();
  if (!session) return null;
  return toSessionResponse(session);
}

export async function getActiveSession(userId: string) {
  await connectDB();
  const session = await PlaySession.findOne({
    userId,
    status: { $in: ["playing", "paused"] },
  })
    .sort({ lastSavedAt: -1 })
    .lean();
  if (!session) return null;
  return toSessionResponse(session);
}

export async function pauseSession(sessionId: string, userId: string) {
  await connectDB();
  const session = await PlaySession.findOne({ _id: sessionId, userId }).lean();
  if (!session) return null;
  if (session.status !== "playing") return null;

  const updated = await PlaySession.findOneAndUpdate(
    { _id: sessionId, userId },
    { status: "paused", pausedAt: new Date(), lastSavedAt: new Date() },
    { new: true }
  ).lean();
  if (!updated) return null;
  return toSessionResponse(updated);
}

export async function resumeSession(sessionId: string, userId: string) {
  await connectDB();
  const session = await PlaySession.findOne({ _id: sessionId, userId }).lean();
  if (!session) return null;
  if (session.status !== "paused") return null;

  const elapsed = session.elapsedTime || 0;
  const pausedDuration = session.pausedAt
    ? Math.floor((Date.now() - new Date(session.pausedAt).getTime()) / 1000)
    : 0;

  const updated = await PlaySession.findOneAndUpdate(
    { _id: sessionId, userId },
    {
      status: "playing",
      pausedAt: null,
      lastSavedAt: new Date(),
    },
    { new: true }
  ).lean();
  if (!updated) return null;
  return toSessionResponse(updated);
}

export async function saveProgress(
  sessionId: string,
  userId: string,
  input: SaveProgressInput
) {
  await connectDB();
  const update: any = {
    currentBoard: input.board,
    elapsedTime: input.elapsedTime,
    lastSavedAt: new Date(),
  };

  if (input.notes) {
    update.notes = input.notes;
  }

  const updated = await PlaySession.findOneAndUpdate(
    { _id: sessionId, userId, status: { $in: ["playing", "paused"] } },
    { $set: update },
    { new: true }
  ).lean();

  if (!updated) return null;
  return toSessionResponse(updated);
}

export async function autosave(
  sessionId: string,
  userId: string,
  input: SaveProgressInput
) {
  return saveProgress(sessionId, userId, input);
}

export async function restartSession(sessionId: string, userId: string) {
  await connectDB();
  const session = await PlaySession.findOne({ _id: sessionId, userId }).lean();
  if (!session) return null;
  if (session.status === "completed") return null;

  const updated = await PlaySession.findOneAndUpdate(
    { _id: sessionId, userId },
    {
      $set: {
        currentBoard: session.initialBoard,
        notes: createEmptyNotes(),
        elapsedTime: 0,
        hintsUsed: 0,
        mistakes: [],
        moves: [],
        result: "incomplete",
        score: 0,
        lastSavedAt: new Date(),
      },
      $inc: { restartCount: 1 },
    },
    { new: true }
  ).lean();

  if (!updated) return null;
  return toSessionResponse(updated);
}

export async function replayPuzzle(userId: string, puzzleId: string) {
  await connectDB();
  const puzzle = await SudokuPuzzle.findById(puzzleId).lean();
  if (!puzzle) return null;

  const session = await PlaySession.create({
    userId,
    puzzleId,
    difficulty: puzzle.difficulty,
    currentBoard: puzzle.puzzle,
    initialBoard: puzzle.puzzle,
    notes: createEmptyNotes(),
    status: "playing",
    startedAt: new Date(),
    lastSavedAt: new Date(),
  });

  return toSessionResponse(session);
}

export async function abandonSession(sessionId: string, userId: string) {
  await connectDB();
  const session = await PlaySession.findOne({ _id: sessionId, userId }).lean();
  if (!session) return null;
  if (session.status === "completed") return null;

  const updated = await PlaySession.findOneAndUpdate(
    { _id: sessionId, userId },
    {
      $set: {
        status: "abandoned",
        result: "gave_up",
        lastSavedAt: new Date(),
      },
    },
    { new: true }
  ).lean();

  if (!updated) return null;
  return toSessionResponse(updated);
}

export async function completeSession(
  sessionId: string,
  userId: string,
  board: string,
  elapsedTime: number,
  score?: number
) {
  await connectDB();
  const session = await PlaySession.findOne({ _id: sessionId, userId }).lean();
  if (!session) return null;
  if (session.status === "completed") return null;

  const update: any = {
    status: "completed",
    currentBoard: board,
    elapsedTime,
    result: "solved",
    completedAt: new Date(),
    lastSavedAt: new Date(),
  };
  if (score !== undefined) update.score = score;

  const updated = await PlaySession.findOneAndUpdate(
    { _id: sessionId, userId },
    { $set: update },
    { new: true }
  ).lean();

  if (!updated) return null;
  return toSessionResponse(updated);
}

export async function getUserHistory(
  userId: string,
  status?: "completed" | "abandoned",
  cursor?: string,
  limit = 20
) {
  await connectDB();
  const filter: any = { userId };
  if (status) filter.status = status;
  if (cursor) filter._id = { $lt: cursor };

  const sessions = await PlaySession.find(filter)
    .sort({ lastSavedAt: -1 })
    .limit(limit)
    .lean();

  return sessions.map(toSessionResponse);
}

export async function getCompletedGames(userId: string, cursor?: string, limit = 20) {
  return getUserHistory(userId, "completed", cursor, limit);
}

export async function getAbandonedGames(userId: string, cursor?: string, limit = 20) {
  return getUserHistory(userId, "abandoned", cursor, limit);
}

export async function canResume(userId: string) {
  await connectDB();
  const session = await PlaySession.findOne({
    userId,
    status: { $in: ["playing", "paused"] },
  })
    .sort({ lastSavedAt: -1 })
    .lean();
  return !!session;
}

export async function getResumableSession(userId: string) {
  await connectDB();
  const session = await PlaySession.findOne({
    userId,
    status: { $in: ["playing", "paused"] },
  })
    .sort({ lastSavedAt: -1 })
    .lean();
  if (!session) return null;
  return toSessionResponse(session);
}
