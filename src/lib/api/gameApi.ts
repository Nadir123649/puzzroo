import { api } from "./client";
import type {
  SudokuPuzzleResponse,
  NonogramPuzzleResponse,
  CrossMathPuzzleResponse,
  TangramPuzzleResponse,
  PuzzleSummary,
  CatalogEntry,
} from "@/lib/server/puzzles/types";

export type GameId = "sudoku" | "nonogram" | "crossmath" | "tangram";

export interface GetPuzzleParams {
  difficulty?: string;
  exclude?: string;
  id?: string;
  date?: string;
}

export interface SaveProgressPayload {
  gameId: GameId;
  puzzleId: string;
  difficulty: "easy" | "medium" | "hard";
  completed?: boolean;
  score?: number;
  time?: number;
  hintsUsed?: number;
  mistakes?: number;
  moves?: number;
  resumeState?: unknown;
}

/**
 * Typed client for the puzzle API. All methods are SSR-safe (no-op-safe on
 * the server) and reuse the shared `api` wrapper (auth header + refresh).
 */
export const gameApi = {
  async getCatalog() {
    return api<CatalogEntry[]>("/api/v1/games");
  },

  async getPuzzle(game: GameId, params: GetPuzzleParams = {}) {
    const res = await api<unknown>(`/api/v1/games/${game}/puzzle`, {
      params: params as Record<string, string | number | boolean | undefined>,
    });
    return res.payload as
      | SudokuPuzzleResponse
      | NonogramPuzzleResponse
      | CrossMathPuzzleResponse
      | TangramPuzzleResponse;
  },

  async getPuzzleById(game: GameId, id: string) {
    return this.getPuzzle(game, { id });
  },

  async getDailyPuzzle(game: GameId, date?: string) {
    return this.getPuzzle(game, { date: date || todayString() });
  },

  async listPuzzles(game: GameId, params: { difficulty?: string; limit?: number; cursor?: string } = {}) {
    const res = await api<{ items: PuzzleSummary[]; nextCursor: string | null }>(
      `/api/v1/games/${game}/puzzles`,
      { params }
    );
    return res.payload;
  },

  async getLeaderboard(
    game: GameId,
    params: { difficulty?: string; period?: string; limit?: number; cursor?: string } = {}
  ) {
    const res = await api<{
      items: Array<{
        userId: string;
        username?: string;
        puzzleId: string;
        difficulty: string;
        score: number;
        time: number;
        completedAt: string;
      }>;
      nextCursor: string | null;
    }>(`/api/v1/games/${game}/leaderboard`, { params });
    return res.payload;
  },

  async saveProgress(payload: SaveProgressPayload) {
    const res = await api("/api/v1/games/progress", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return res.payload;
  },

  async getProgress(game: GameId, puzzleId?: string) {
    const res = await api<unknown>(`/api/v1/games/progress`, {
      params: { gameId: game, puzzleId: puzzleId || "" },
    });
    return res.payload;
  },

  async complete(game: GameId, payload: Omit<SaveProgressPayload, "gameId" | "completed">) {
    const res = await api(`/api/v1/games/${game}/complete`, {
      method: "POST",
      body: JSON.stringify({ ...payload, completed: true }),
    });
    return res.payload;
  },

  async getStats() {
    const res = await api<{
      gamesPlayed: number;
      completed: number;
      currentStreak: number;
      completionRate: string;
      recentActivity: Array<{
        gameId: string;
        difficulty: string;
        completed: boolean;
        score: number;
        time: number;
        lastPlayed: string;
      }>;
    }>("/api/v1/games/stats");
    return res.payload;
  },
};

function todayString(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
