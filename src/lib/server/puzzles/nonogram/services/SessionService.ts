import PlaySession from "@/lib/server/models/PlaySession";
import NonogramPuzzle from "@/lib/server/models/NonogramPuzzle";
import type { SessionStatus } from "../types";

interface StartSessionInput {
  userId: string;
  puzzleId: string;
  difficulty: string;
}

interface SaveProgressInput {
  grid: Array<Array<{ state: string }>>;
  elapsedSeconds: number;
  hintsUsed?: number;
  mistakes?: number;
}

export class SessionService {
  async startSession(input: StartSessionInput) {
    const puzzle = await NonogramPuzzle.findOne({ puzzleId: input.puzzleId });
    if (!puzzle) {
      throw new Error("puzzle_not_found");
    }

    const existing = await PlaySession.findOne({
      userId: input.userId,
      puzzleId: input.puzzleId,
      status: { $in: ["active", "paused"] },
    });

    if (existing) {
      return existing;
    }

    const size = puzzle.size;
    const emptyGrid = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => ({ state: "empty" }))
    );

    const session = await PlaySession.create({
      userId: input.userId,
      puzzleId: input.puzzleId,
      gameId: "nonogram",
      difficulty: input.difficulty,
      grid: emptyGrid,
      status: "active",
      startedAt: new Date(),
    });

    return session;
  }

  async getSessionById(sessionId: string, userId: string) {
    const session = await PlaySession.findById(sessionId);
    if (!session) {
      throw new Error("session_not_found");
    }
    if (session.userId.toString() !== userId) {
      throw new Error("not_owner");
    }
    return session;
  }

  async getActiveSession(userId: string, puzzleId?: string) {
    const filter: any = {
      userId,
      status: { $in: ["active", "paused"] },
    };
    if (puzzleId) {
      filter.puzzleId = puzzleId;
    }
    return PlaySession.findOne(filter).sort({ updatedAt: -1 });
  }

  async resumeSession(sessionId: string, userId: string) {
    const session = await this.getSessionById(sessionId, userId);
    if (session.status !== "paused") {
      throw new Error("session_not_paused");
    }
    session.status = "active";
    session.resumedAt = new Date();
    await session.save();
    return session;
  }

  async pauseSession(sessionId: string, userId: string) {
    const session = await this.getSessionById(sessionId, userId);
    if (session.status !== "active") {
      throw new Error("session_not_active");
    }
    session.status = "paused";
    session.pausedAt = new Date();
    await session.save();
    return session;
  }

  async saveProgress(sessionId: string, userId: string, input: SaveProgressInput) {
    const session = await this.getSessionById(sessionId, userId);

    session.grid = input.grid;
    session.elapsedSeconds = input.elapsedSeconds;
    session.lastSaveAt = new Date();

    if (input.hintsUsed !== undefined) {
      session.hintsUsed = input.hintsUsed;
    }
    if (input.mistakes !== undefined) {
      session.mistakes = input.mistakes;
    }

    await session.save();
    return session;
  }

  async restartSession(sessionId: string, userId: string) {
    const session = await this.getSessionById(sessionId, userId);

    const puzzle = await NonogramPuzzle.findOne({ puzzleId: session.puzzleId });
    if (!puzzle) {
      throw new Error("puzzle_not_found");
    }

    const size = puzzle.size;
    const emptyGrid = Array.from({ length: size }, () =>
      Array.from({ length: size }, () => ({ state: "empty" }))
    );

    session.grid = emptyGrid;
    session.status = "active";
    session.elapsedSeconds = 0;
    session.hintsUsed = 0;
    session.mistakes = 0;
    session.restartCount = (session.restartCount || 0) + 1;
    session.startedAt = new Date();
    session.pausedAt = null;
    session.resumedAt = null;
    session.lastSaveAt = null;
    session.completedAt = null;
    session.completionResult = undefined;

    await session.save();
    return session;
  }

  async replaySession(userId: string, puzzleId: string, difficulty: string) {
    const existing = await PlaySession.findOne({
      userId,
      puzzleId,
      status: { $in: ["active", "paused"] },
    });

    if (existing) {
      existing.replayCount = (existing.replayCount || 0) + 1;
      await existing.save();
      return this.restartSession(existing._id.toString(), userId);
    }

    return this.startSession({ userId, puzzleId, difficulty });
  }

  async abandonSession(sessionId: string, userId: string, reason?: string) {
    const session = await this.getSessionById(sessionId, userId);
    if (session.status === "completed") {
      throw new Error("already_completed");
    }

    session.status = "abandoned";
    session.abandonReason = reason || null;
    session.completedAt = new Date();
    await session.save();

    return session;
  }

  async completeSession(
    sessionId: string,
    userId: string,
    result: {
      isComplete: boolean;
      accuracy: number;
      totalCells: number;
      correctCells: number;
    }
  ) {
    const session = await this.getSessionById(sessionId, userId);
    if (session.status === "completed") {
      throw new Error("already_completed");
    }
    if (session.status === "abandoned") {
      throw new Error("session_abandoned");
    }

    session.status = "completed";
    session.completedAt = new Date();
    session.completionResult = {
      isComplete: result.isComplete,
      accuracy: result.accuracy,
      totalCells: result.totalCells,
      correctCells: result.correctCells,
    };

    await session.save();
    return session;
  }

  async listSessions(
    userId: string,
    options: {
      status?: SessionStatus;
      limit?: number;
      skip?: number;
      sortBy?: string;
      sortOrder?: 1 | -1;
    } = {}
  ) {
    const filter: any = { userId };
    if (options.status) {
      filter.status = options.status;
    }

    const total = await PlaySession.countDocuments(filter);

    const sessions = await PlaySession.find(filter)
      .sort({ [options.sortBy || "createdAt"]: options.sortOrder || -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 20)
      .lean();

    return { sessions, total };
  }
}

export const sessionService = new SessionService();
