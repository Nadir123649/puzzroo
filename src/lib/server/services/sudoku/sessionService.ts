import { connectDB } from "@/lib/server/db";
import SudokuPuzzle from "@/lib/server/models/SudokuPuzzle";
import PlaySession from "@/lib/server/models/sudoku/PlaySession";
import type { Actor } from "@/app/api/v1/games/sudoku/route-helpers";
import type {
  SessionStatus,
  SessionResult,
  SessionResponse,
  SaveProgressInput,
} from "./types";
import { isEmptyNotes } from "./utils";
import { verifyCompletion, calculateScore, validateElapsedTime } from "./verificationService";
import { sudokuPlaySessionRepository } from "./SudokuPlaySessionRepository";

function actorId(actor: Actor): string {
  return actor.id;
}

function actorGuestId(actor: Actor): string | undefined {
  return actor.type === "guest" ? actor.id : undefined;
}

function actorToOwner(actor: Actor): { userId?: string; guestId?: string } {
  const guestId = actorGuestId(actor);
  if (guestId) return { guestId };
  return { userId: actor.id };
}

function assertOwnership(session: any, actor: Actor): void {
  const guestId = actorGuestId(actor);
  if (guestId) {
    if (session.guestId !== guestId) throw new Error("not_owner");
  } else {
    if (!session.userId || String(session.userId) !== actor.id) throw new Error("not_owner");
  }
}

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
    gameType: doc.gameType || "sudoku",
    dailyChallengeId: doc.dailyChallengeId || null,
  };
}

export async function createSession(actor: Actor, puzzleId: string, gameType?: "sudoku" | "daily_challenge", dailyChallengeId?: string) {
  await connectDB();

  const { userId, guestId } = actorToOwner(actor);

  if (gameType === "daily_challenge" && dailyChallengeId) {
    const existing = await sudokuPlaySessionRepository.findActiveDailyByChallenge(dailyChallengeId, userId, guestId);
    if (existing) return toSessionResponse(existing.toObject());
  } else {
    const existing = await sudokuPlaySessionRepository.findActiveByUserAndPuzzle(puzzleId, userId, guestId);
    if (existing) return toSessionResponse(existing.toObject());
  }

  const puzzle = await SudokuPuzzle.findOne({ puzzleId }).lean();
  if (!puzzle) throw new Error("puzzle_not_found");

  try {
    const session = await sudokuPlaySessionRepository.create({
      userId: guestId ? undefined : userId,
      guestId,
      puzzleId,
      gameType,
      dailyChallengeId,
      difficulty: puzzle.difficulty,
      currentBoard: puzzle.puzzle,
      initialBoard: puzzle.puzzle,
    });
    return toSessionResponse(session.toObject());
  } catch (error: any) {
    if (error?.code === 11000) {
      if (gameType === "daily_challenge" && dailyChallengeId) {
        const existing = await sudokuPlaySessionRepository.findActiveDailyByChallenge(dailyChallengeId, userId, guestId);
        if (existing) return toSessionResponse(existing.toObject());
      } else {
        const existing = await sudokuPlaySessionRepository.findActiveByUserAndPuzzle(puzzleId, userId, guestId);
        if (existing) return toSessionResponse(existing.toObject());
      }
    }
    throw error;
  }
}

export async function getSession(sessionId: string, actor: Actor) {
  await connectDB();
  const session = await sudokuPlaySessionRepository.findById(sessionId);
  if (!session) throw new Error("session_not_found");
  assertOwnership(session, actor);
  return toSessionResponse(session.toObject());
}

export async function getActiveSession(actor: Actor) {
  await connectDB();
  const { userId, guestId } = actorToOwner(actor);
  const session = await sudokuPlaySessionRepository.findActiveByOwner(userId, guestId);
  if (!session) return null;
  return toSessionResponse(session.toObject());
}

export async function pauseSession(sessionId: string, actor: Actor) {
  await connectDB();
  const session = await getSession(sessionId, actor);
  if (session.status !== "playing") throw new Error("session_not_active");

  const { userId, guestId } = actorToOwner(actor);
  const owner = await sudokuPlaySessionRepository.ownerFilter(userId, guestId);
  const updated = await sudokuPlaySessionRepository.pause(sessionId, owner);
  if (!updated) throw new Error("session_not_found");
  return toSessionResponse(updated.toObject());
}

export async function resumeSession(sessionId: string, actor: Actor) {
  await connectDB();
  const session = await getSession(sessionId, actor);
  if (session.status !== "paused") throw new Error("session_not_paused");

  const { userId, guestId } = actorToOwner(actor);
  const owner = await sudokuPlaySessionRepository.ownerFilter(userId, guestId);
  const updated = await sudokuPlaySessionRepository.resume(sessionId, owner);
  if (!updated) throw new Error("session_not_found");
  return toSessionResponse(updated.toObject());
}

export async function saveProgress(
  sessionId: string,
  actor: Actor,
  input: SaveProgressInput
) {
  await connectDB();

  const { userId, guestId } = actorToOwner(actor);
  const owner = await sudokuPlaySessionRepository.ownerFilter(userId, guestId);

  const updated = await sudokuPlaySessionRepository.saveProgress(sessionId, input, owner);
  if (!updated) {
    const exists = await sudokuPlaySessionRepository.findById(sessionId);
    if (!exists) throw new Error("session_not_found");
    assertOwnership(exists, actor);
    throw new Error("session_not_active");
  }
  return toSessionResponse(updated.toObject());
}

export async function autosave(
  sessionId: string,
  actor: Actor,
  input: SaveProgressInput
) {
  return saveProgress(sessionId, actor, input);
}

export async function restartSession(sessionId: string, actor: Actor) {
  await connectDB();
  const session = await getSession(sessionId, actor);
  if (session.status === "completed") throw new Error("already_completed");

  const { userId, guestId } = actorToOwner(actor);
  const owner = await sudokuPlaySessionRepository.ownerFilter(userId, guestId);
  const updated = await sudokuPlaySessionRepository.restart(sessionId, session.initialBoard, owner);

  if (!updated) throw new Error("session_not_found");
  return toSessionResponse(updated.toObject());
}

export async function replayPuzzle(actor: Actor, puzzleId: string) {
  await connectDB();

  const { userId, guestId } = actorToOwner(actor);
  await sudokuPlaySessionRepository.abandonActiveForPuzzle(puzzleId, userId, guestId);

  const puzzle = await SudokuPuzzle.findOne({ puzzleId }).lean();
  if (!puzzle) throw new Error("puzzle_not_found");

  const session = await sudokuPlaySessionRepository.create({
    userId: guestId ? undefined : userId,
    guestId,
    puzzleId,
    difficulty: puzzle.difficulty,
    currentBoard: puzzle.puzzle,
    initialBoard: puzzle.puzzle,
    isReplay: true,
  });

  return {
    session: toSessionResponse(session.toObject()),
    puzzle: {
      puzzleId: puzzle.puzzleId,
      difficulty: puzzle.difficulty,
      puzzle: puzzle.puzzle,
      solution: puzzle.solution,
    },
  };
}

export async function abandonSession(sessionId: string, actor: Actor) {
  await connectDB();
  const session = await getSession(sessionId, actor);
  if (session.status === "completed") throw new Error("already_completed");
  if (!["playing", "paused"].includes(session.status)) throw new Error("session_not_active");

  const { userId, guestId } = actorToOwner(actor);
  const owner = await sudokuPlaySessionRepository.ownerFilter(userId, guestId);
  const updated = await sudokuPlaySessionRepository.abandon(sessionId, owner);

  if (!updated) throw new Error("session_not_found");
  return toSessionResponse(updated.toObject());
}

export async function completeSession(
  sessionId: string,
  actor: Actor,
  board: string,
  elapsedTime: number,
  hintsUsed?: number,
  mistakes?: number,
  moves?: number
) {
  await connectDB();
  const session = await getSession(sessionId, actor);
  if (session.status === "completed") throw new Error("already_completed");

  const validatedTime = validateElapsedTime(
    elapsedTime,
    session.elapsedTime || 0,
    session.startedAt ? new Date(session.startedAt) : new Date()
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

  const { userId, guestId } = actorToOwner(actor);
  const owner = await sudokuPlaySessionRepository.ownerFilter(userId, guestId);

  const updated = await sudokuPlaySessionRepository.complete(sessionId, {
    board,
    elapsedTime: validatedTime,
    moves: finalMoves,
    mistakes: finalMistakes,
    hintsUsed: finalHints,
    score,
  }, owner);

  if (!updated) {
    const existing = await sudokuPlaySessionRepository.findById(sessionId);
    if (!existing) throw new Error("session_not_found");
    assertOwnership(existing, actor);
    throw new Error("already_completed");
  }
  return toSessionResponse(updated);
}

export async function getUserHistory(
  actor: Actor,
  status?: "completed" | "abandoned",
  cursor?: string,
  limit = 20
) {
  await connectDB();
  const { userId, guestId } = actorToOwner(actor);
  const owner = await sudokuPlaySessionRepository.ownerFilter(userId, guestId);
  const result = await sudokuPlaySessionRepository.findHistory(owner, status, cursor, limit);
  return result.sessions.map(toSessionResponse);
}

export async function getRecentSessions(actor: Actor, limit = 10) {
  await connectDB();
  const { userId, guestId } = actorToOwner(actor);
  const sessions = await sudokuPlaySessionRepository.findRecentByUser(limit, userId, guestId);
  return sessions.map(toSessionResponse);
}

export async function getCompletedGames(actor: Actor, cursor?: string, limit = 20) {
  return getUserHistory(actor, "completed", cursor, limit);
}

export async function getAbandonedGames(actor: Actor, cursor?: string, limit = 20) {
  return getUserHistory(actor, "abandoned", cursor, limit);
}

export async function canResume(actor: Actor) {
  await connectDB();
  const { userId, guestId } = actorToOwner(actor);
  const session = await sudokuPlaySessionRepository.findActiveByOwner(userId, guestId);
  return !!session;
}

export async function getResumableSession(actor: Actor, gameType?: "sudoku" | "daily_challenge", difficulty?: string) {
  await connectDB();
  const { userId, guestId } = actorToOwner(actor);

  const filter: Record<string, unknown> = {
    status: { $in: ["playing", "paused"] },
  };
  if (guestId) {
    filter.guestId = guestId;
  } else {
    filter.userId = userId;
  }
  if (gameType === "daily_challenge") {
    filter.gameType = "daily_challenge";
  } else {
    filter.gameType = { $ne: "daily_challenge" };
  }

  const activeSessions = await PlaySession.find(filter)
    .sort({ lastSavedAt: -1 })
    .lean();

  if (!activeSessions || activeSessions.length === 0) return { hasActiveSession: false };

  let session = null;
  let puzzle = null;

  if (difficulty) {
    for (const sess of activeSessions) {
      if (sess.difficulty === difficulty) {
        session = sess;
        puzzle = await SudokuPuzzle.findOne({ puzzleId: sess.puzzleId }).lean();
        break;
      }
      const p = await SudokuPuzzle.findOne({ puzzleId: sess.puzzleId }).lean();
      if (p && p.difficulty === difficulty) {
        session = sess;
        puzzle = p;
        PlaySession.updateOne({ _id: sess._id }, { $set: { difficulty: p.difficulty } }).catch(() => {});
        break;
      }
    }
  } else {
    session = activeSessions[0];
    puzzle = await SudokuPuzzle.findOne({ puzzleId: session.puzzleId }).lean();
  }

  if (!session) return { hasActiveSession: false };

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
          actor,
          board,
          elapsedTime,
          hintsUsed,
          mistakes,
          moves,
        )
        return { hasActiveSession: false }
      }
    } catch {
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
