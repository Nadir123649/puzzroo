import PlaySession from "@/lib/server/models/sudoku/PlaySession";
import { createEmptyNotes } from "./utils";
import type { SessionStatus } from "./types";

interface CreateSessionInput {
  userId?: string;
  guestId?: string;
  puzzleId: string;
  gameType?: "sudoku" | "daily_challenge";
  dailyChallengeId?: string;
  difficulty: string;
  currentBoard: string;
  initialBoard: string;
  isReplay?: boolean;
}

interface SessionQuery {
  status?: SessionStatus;
  limit?: number;
  skip?: number;
}

export class SudokuPlaySessionRepository {
  async create(input: CreateSessionInput) {
    const doc: Record<string, unknown> = {
      puzzleId: input.puzzleId,
      gameType: input.gameType || "sudoku",
      difficulty: input.difficulty,
      status: "playing",
      currentBoard: input.currentBoard,
      initialBoard: input.initialBoard,
      notes: createEmptyNotes(),
      isReplay: input.isReplay || false,
      startedAt: new Date(),
      lastSavedAt: new Date(),
    };
    if (input.dailyChallengeId) {
      doc.dailyChallengeId = input.dailyChallengeId;
    }
    if (input.guestId) {
      doc.guestId = input.guestId;
    } else {
      doc.userId = input.userId;
    }
    return PlaySession.create(doc);
  }

  async findById(sessionId: string) {
    return PlaySession.findById(sessionId);
  }

  async findActiveByUserAndPuzzle(puzzleId: string, userId?: string, guestId?: string) {
    const filter: Record<string, unknown> = {
      puzzleId,
      status: { $in: ["playing", "paused"] },
    };
    if (guestId) {
      filter.guestId = guestId;
    } else if (userId) {
      filter.userId = userId;
    }
    return PlaySession.findOne(filter);
  }

  async findActiveByOwner(userId?: string, guestId?: string) {
    const filter: Record<string, unknown> = {
      status: { $in: ["playing", "paused"] },
    };
    if (guestId) {
      filter.guestId = guestId;
    } else if (userId) {
      filter.userId = userId;
    }
    return PlaySession.findOne(filter).sort({ lastSavedAt: -1 });
  }

  async findActiveDailyByChallenge(dailyChallengeId: string, userId?: string, guestId?: string) {
    const filter: Record<string, unknown> = {
      dailyChallengeId,
      gameType: "daily_challenge",
      status: { $in: ["playing", "paused"] },
    };
    if (guestId) {
      filter.guestId = guestId;
    } else if (userId) {
      filter.userId = userId;
    }
    return PlaySession.findOne(filter).sort({ lastSavedAt: -1 });
  }

  async findRecentByUser(limit = 10, userId?: string, guestId?: string) {
    const filter: Record<string, unknown> = {};
    if (guestId) {
      filter.guestId = guestId;
    } else if (userId) {
      filter.userId = userId;
    }
    return PlaySession.find(filter)
      .sort({ lastSavedAt: -1 })
      .limit(limit)
      .lean();
  }

  async findCompleteByOwner(userId?: string, guestId?: string) {
    const filter: Record<string, unknown> = { status: "completed" };
    if (guestId) {
      filter.guestId = guestId;
    } else if (userId) {
      filter.userId = userId;
    }
    return PlaySession.find(filter).sort({ completedAt: -1 });
  }

  async findHistory(
    owner: Record<string, unknown>,
    status?: string,
    cursor?: string,
    limit = 20
  ) {
    const filter: Record<string, unknown> = { ...owner };
    if (status) filter.status = status;
    if (cursor) filter._id = { $lt: cursor };

    const sessions = await PlaySession.find(filter)
      .sort({ lastSavedAt: -1 })
      .limit(limit)
      .lean();

    const total = await PlaySession.countDocuments(filter);
    return { sessions, total };
  }

  async ownerFilter(userId?: string, guestId?: string): Promise<Record<string, unknown>> {
    if (guestId) return { guestId };
    if (userId) return { userId };
    return {};
  }

  async saveProgress(
    sessionId: string,
    input: {
      board: string;
      elapsedTime: number;
      hintsUsed?: number;
      mistakes?: number;
      moves?: number;
      notes?: string[][];
      score?: number;
    },
    owner: Record<string, unknown>
  ) {
    const $set: Record<string, unknown> = {
      currentBoard: input.board,
      lastSavedAt: new Date(),
    };
    const $max: Record<string, unknown> = {
      elapsedTime: input.elapsedTime,
    };
    if (input.hintsUsed !== undefined) $max.hintsUsed = input.hintsUsed;
    if (input.mistakes !== undefined) $max.mistakes = input.mistakes;
    if (input.moves !== undefined) $max.moves = input.moves;
    if (input.score !== undefined) $set.score = input.score;
    if (input.notes) $set.notes = input.notes;

    return PlaySession.findOneAndUpdate(
      { _id: sessionId, ...owner, status: { $in: ["playing", "paused"] } },
      { $set, $max },
      { new: true }
    );
  }

  async complete(
    sessionId: string,
    data: {
      board: string;
      elapsedTime: number;
      score: number;
      moves: number;
      mistakes: number;
      hintsUsed: number;
    },
    owner: Record<string, unknown>
  ) {
    const now = new Date();
    return PlaySession.findOneAndUpdate(
      { _id: sessionId, ...owner, status: { $in: ["playing", "paused"] } },
      {
        $set: {
          status: "completed",
          currentBoard: data.board,
          elapsedTime: data.elapsedTime,
          result: "solved",
          score: data.score,
          moves: data.moves,
          mistakes: data.mistakes,
          hintsUsed: data.hintsUsed,
          completedAt: now,
          lastSavedAt: now,
        },
      },
      { new: true }
    );
  }

  async pause(sessionId: string, owner: Record<string, unknown>) {
    return PlaySession.findOneAndUpdate(
      { _id: sessionId, ...owner },
      { status: "paused", pausedAt: new Date(), lastSavedAt: new Date() },
      { new: true }
    );
  }

  async resume(sessionId: string, owner: Record<string, unknown>) {
    return PlaySession.findOneAndUpdate(
      { _id: sessionId, ...owner },
      {
        status: "playing",
        pausedAt: null,
        lastSavedAt: new Date(),
      },
      { new: true }
    );
  }

  async abandon(sessionId: string, owner: Record<string, unknown>) {
    return PlaySession.findOneAndUpdate(
      { _id: sessionId, ...owner, status: { $in: ["playing", "paused"] } },
      {
        $set: {
          status: "abandoned",
          result: "gave_up",
          lastSavedAt: new Date(),
        },
      },
      { new: true }
    );
  }

  async restart(sessionId: string, initialBoard: string, owner: Record<string, unknown>) {
    return PlaySession.findOneAndUpdate(
      { _id: sessionId, ...owner },
      {
        $set: {
          currentBoard: initialBoard,
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
    );
  }

  async abandonActiveForPuzzle(puzzleId: string, userId?: string, guestId?: string) {
    const filter: Record<string, unknown> = {
      puzzleId,
      status: { $in: ["playing", "paused"] },
    };
    if (guestId) {
      filter.guestId = guestId;
    } else if (userId) {
      filter.userId = userId;
    }
    const existing = await PlaySession.findOne(filter).lean();
    if (existing) {
      await PlaySession.findOneAndUpdate(
        { _id: existing._id },
        { $set: { status: "abandoned", result: "gave_up" } }
      );
    }
    return existing;
  }

  async deleteExpired(before: Date) {
    return PlaySession.deleteMany({
      status: { $in: ["completed", "abandoned"] },
      lastSavedAt: { $lt: before },
    });
  }
}

export const sudokuPlaySessionRepository = new SudokuPlaySessionRepository();
