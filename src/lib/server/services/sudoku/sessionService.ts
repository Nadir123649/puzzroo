import { connectDB } from "@/lib/server/db";
import SudokuPuzzle from "@/lib/server/models/SudokuPuzzle";
import PlaySession from "@/lib/server/models/sudoku/PlaySession";
import type {
  SessionStatus,
  SessionResult,
  SessionResponse,
  SaveProgressInput,
} from "./types";
import { encode81, decode81, cloneBoard, createEmptyNotes, isEmptyNotes } from "./utils";
import { verifyCompletion, calculateScore, validateElapsedTime } from "./verificationService";

function toSessionResponse(doc: any): SessionResponse {
  return {
    id: String(doc._id),
    puzzleId: String(doc.puzzleId),
    difficulty: doc.difficulty || "medium",
    status: doc.status as SessionStatus,
    currentBoard: doc.currentBoard,
    initialBoard: doc.initialBoard,
    notes: doc.notes && !isEmptyNotes(doc.notes) ? doc.notes : null,
    elapsedTime: doc.elapsedTime || 0,
    hintsUsed: doc.hintsUsed || 0,
    mistakes: doc.mistakes || 0,
    moves: doc.moves || 0,
    result: (doc.result || "incomplete") as SessionResult,
    score: doc.score || 0,
    restartCount: doc.restartCount || 0,
    startedAt: doc.startedAt?.toISOString?.() || new Date().toISOString(),
    pausedAt: doc.pausedAt?.toISOString?.() || null,
    lastSavedAt: doc.lastSavedAt?.toISOString?.() || new Date().toISOString(),
    isReplay: doc.isReplay || false,
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

  const puzzle = await SudokuPuzzle.findOne({ puzzleId }).lean();
  if (!puzzle) throw new Error("puzzle_not_found");

  try {
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
  } catch (error: any) {
    if (error?.code === 11000) {
      const existing = await PlaySession.findOne({
        userId,
        puzzleId,
        status: { $in: ["playing", "paused"] },
      }).lean();
      if (existing) return toSessionResponse(existing);
    }
    throw error;
  }
}

export async function getSession(sessionId: string, userId: string) {
  await connectDB();
  const session = await PlaySession.findOne({ _id: sessionId, userId }).lean();
  if (!session) throw new Error("session_not_found");
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
  if (!session) throw new Error("session_not_found");
  if (session.status !== "playing") throw new Error("session_not_active");

  const updated = await PlaySession.findOneAndUpdate(
    { _id: sessionId, userId },
    { status: "paused", pausedAt: new Date(), lastSavedAt: new Date() },
    { new: true }
  ).lean();
  if (!updated) throw new Error("session_not_found");
  return toSessionResponse(updated);
}

export async function resumeSession(sessionId: string, userId: string) {
  await connectDB();
  const session = await PlaySession.findOne({ _id: sessionId, userId }).lean();
  if (!session) throw new Error("session_not_found");
  if (session.status !== "paused") throw new Error("session_not_paused");

  const updated = await PlaySession.findOneAndUpdate(
    { _id: sessionId, userId },
    {
      status: "playing",
      pausedAt: null,
      lastSavedAt: new Date(),
    },
    { new: true }
  ).lean();
  if (!updated) throw new Error("session_not_found");
  return toSessionResponse(updated);
}

export async function saveProgress(
  sessionId: string,
  userId: string,
  input: SaveProgressInput
) {
  await connectDB();

  const session = await PlaySession.findOne({ _id: sessionId, userId }).lean();
  if (!session) throw new Error("session_not_found");
  if (!["playing", "paused"].includes(session.status)) throw new Error("session_not_active");

  const $set: any = {
    currentBoard: input.board,
    elapsedTime: input.elapsedTime,
    lastSavedAt: new Date(),
  };

  if (input.hintsUsed !== undefined) $set.hintsUsed = input.hintsUsed;
  if (input.mistakes !== undefined) $set.mistakes = input.mistakes;
  if (input.moves !== undefined) $set.moves = input.moves;
  if (input.notes) $set.notes = input.notes;

  const update: any = { $set };

  const updated = await PlaySession.findOneAndUpdate(
    { _id: sessionId, userId, status: { $in: ["playing", "paused"] } },
    update,
    { new: true }
  ).lean();

  if (!updated) throw new Error("session_not_active");
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
  if (!session) throw new Error("session_not_found");
  if (session.status === "completed") throw new Error("already_completed");

  const updated = await PlaySession.findOneAndUpdate(
    { _id: sessionId, userId },
    {
      $set: {
        currentBoard: session.initialBoard,
        notes: createEmptyNotes(),
        elapsedTime: 0,
        hintsUsed: 0,
        mistakes: 0,
        moves: 0,
        result: "incomplete",
        score: 0,
        status: "playing",
        lastSavedAt: new Date(),
      },
      $inc: { restartCount: 1 },
    },
    { new: true }
  ).lean();

  if (!updated) throw new Error("session_not_found");
  return toSessionResponse(updated);
}

export async function replayPuzzle(userId: string, puzzleId: string) {
  await connectDB();

  const existing = await PlaySession.findOne({
    userId,
    puzzleId,
    status: { $in: ["playing", "paused"] },
  }).lean();
  if (existing) {
    await PlaySession.findOneAndUpdate(
      { _id: existing._id },
      { $set: { status: "abandoned", result: "gave_up" } }
    );
  }

  const puzzle = await SudokuPuzzle.findOne({ puzzleId }).lean();
  if (!puzzle) throw new Error("puzzle_not_found");

  const session = await PlaySession.create({
    userId,
    puzzleId,
    difficulty: puzzle.difficulty,
    currentBoard: puzzle.puzzle,
    initialBoard: puzzle.puzzle,
    notes: createEmptyNotes(),
    status: "playing",
    isReplay: true,
    startedAt: new Date(),
    lastSavedAt: new Date(),
  });

  return {
    session: toSessionResponse(session),
    puzzle: {
      puzzleId: puzzle.puzzleId,
      difficulty: puzzle.difficulty,
      puzzle: puzzle.puzzle,
      solution: puzzle.solution,
    },
  };
}

export async function abandonSession(sessionId: string, userId: string) {
  await connectDB();
  const session = await PlaySession.findOne({ _id: sessionId, userId }).lean();
  if (!session) throw new Error("session_not_found");
  if (session.status === "completed") throw new Error("already_completed");
  if (!["playing", "paused"].includes(session.status)) throw new Error("session_not_active");

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

  if (!updated) throw new Error("session_not_found");
  return toSessionResponse(updated);
}

export async function completeSession(
  sessionId: string,
  userId: string,
  board: string,
  elapsedTime: number,
  hintsUsed?: number,
  mistakes?: number,
  moves?: number
) {
  await connectDB();
  const session = await PlaySession.findOne({ _id: sessionId, userId }).lean();
  if (!session) throw new Error("session_not_found");
  if (session.status === "completed") throw new Error("already_completed");
  if (!["playing", "paused"].includes(session.status)) throw new Error("session_not_active");

  const validatedTime = validateElapsedTime(
    elapsedTime,
    session.elapsedTime || 0,
    session.startedAt || new Date()
  );

  const finalHints = hintsUsed ?? session.hintsUsed ?? 0;
  const finalMistakes = mistakes ?? session.mistakes ?? 0;
  const score = calculateScore(
    (session.difficulty || "medium") as any,
    validatedTime,
    finalHints,
    finalMistakes
  );
  const finalMoves = moves ?? session.moves ?? 0;

  const $set: Record<string, unknown> = {
    status: "completed",
    currentBoard: board,
    elapsedTime: validatedTime,
    result: "solved",
    score,
    moves: finalMoves,
    hintsUsed: finalHints,
    mistakes: finalMistakes,
    completedAt: new Date(),
    lastSavedAt: new Date(),
  };

  const updated = await PlaySession.findOneAndUpdate(
    { _id: sessionId, userId, status: { $in: ["playing", "paused"] } },
    { $set },
    { new: true }
  ).lean();

  if (!updated) {
    const existing = await PlaySession.findOne({ _id: sessionId, userId }).lean();
    if (!existing) throw new Error("session_not_found");
    throw new Error("already_completed");
  }
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
  if (!session) return { hasActiveSession: false };

  const puzzle = await SudokuPuzzle.findOne({ puzzleId: session.puzzleId }).lean();

  // If board is fully filled (no '0' cells), verify it. If solved,
  // auto-complete rather than returning a session the user can't make
  // progress on. Eliminates the tab-close / network-failure race.
  const board = session.currentBoard || ""
  if (puzzle && board.length === 81 && !board.includes("0")) {
    try {
      const verification = await verifyCompletion(board, puzzle.solution)
      if (verification.valid) {
        const elapsedTime = session.elapsedTime || 0
        const hintsUsed = session.hintsUsed || 0
        const mistakes = session.mistakes || 0
        const moves = session.moves || 0
        await completeSession(
          String(session._id),
          userId,
          board,
          elapsedTime,
          hintsUsed,
          mistakes,
          moves,
        )
        return { hasActiveSession: false }
      }
    } catch {
      // Verification failure should not prevent the user from
      // continuing — fall through to normal session return.
    }
  }

  const base = toSessionResponse(session);
  return {
    hasActiveSession: true,
    session: {
      ...base,
      puzzle: puzzle
        ? { puzzleId: puzzle.puzzleId, difficulty: puzzle.difficulty, puzzle: puzzle.puzzle, solution: puzzle.solution }
        : undefined,
    },
  };
}
