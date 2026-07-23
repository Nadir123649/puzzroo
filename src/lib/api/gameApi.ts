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
  difficulty: "easy" | "medium" | "hard" | "expert";
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
      suppressToast: true,
    });
    return res.payload as
      | SudokuPuzzleResponse
      | NonogramPuzzleResponse
      | CrossMathPuzzleResponse
      | TangramPuzzleResponse;
  },

  async getPuzzleById(game: GameId, id: string) {
    const res = await api<unknown>(`/api/v1/games/${game}/puzzle/${encodeURIComponent(id)}`, {
      suppressToast: true,
    });
    return res.payload as
      | SudokuPuzzleResponse
      | NonogramPuzzleResponse
      | CrossMathPuzzleResponse
      | TangramPuzzleResponse;
  },

  async getDailyPuzzle(game: GameId, date?: string) {
    const params = date ? { date } : undefined;
    const res = await api<unknown>(`/api/v1/games/${game}/daily`, {
      params,
      suppressToast: true,
    });
    return res.payload as
      | SudokuPuzzleResponse
      | NonogramPuzzleResponse
      | CrossMathPuzzleResponse
      | TangramPuzzleResponse;
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


  // ---- Nonogram-specific endpoints ----

  async startNonogramSession(puzzleId: string, difficulty: string) {
    const res = await api<{ sessionId: string; status: string }>(
      '/api/v1/nonogram/session',
      { method: 'POST', body: JSON.stringify({ puzzleId, difficulty }) }
    );
    return res.payload;
  },

  async pauseNonogramSession(sessionId: string) {
    const res = await api(`/api/v1/nonogram/session/${sessionId}/pause`, { method: 'POST' });
    return res.payload;
  },

  async resumeNonogramSession(sessionId: string) {
    const res = await api(`/api/v1/nonogram/session/${sessionId}/resume`, { method: 'POST' });
    return res.payload;
  },

  async saveNonogramProgress(
    sessionId: string,
    data: { grid: Array<Array<{ state: string }>>; elapsedSeconds: number; hintsUsed?: number; mistakes?: number }
  ) {
    const res = await api(`/api/v1/nonogram/session/${sessionId}/save`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.payload;
  },

  async restartNonogramSession(sessionId: string) {
    const res = await api(`/api/v1/nonogram/session/${sessionId}/restart`, { method: 'POST' });
    return res.payload;
  },

  async replayNonogramSession(sessionId: string) {
    const res = await api(`/api/v1/nonogram/session/${sessionId}/replay`, { method: 'POST' });
    return res.payload;
  },

  async abandonNonogramSession(sessionId: string, reason?: string) {
    const res = await api(`/api/v1/nonogram/session/${sessionId}/abandon`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return res.payload;
  },

  async verifyNonogramSolution(sessionId: string, grid: Array<Array<{ state: string }>>) {
    const res = await api('/api/v1/nonogram/verify', {
      method: 'POST',
      body: JSON.stringify({ sessionId, grid }),
    });
    return res.payload;
  },

  async completeNonogramPuzzle(
    sessionId: string,
    grid: Array<Array<{ state: string }>>,
    elapsedSeconds: number,
    hintsUsed?: number,
    mistakes?: number
  ) {
    const res = await api('/api/v1/nonogram/complete', {
      method: 'POST',
      body: JSON.stringify({ sessionId, grid, elapsedSeconds, hintsUsed, mistakes }),
    });
    return res.payload;
  },

  async getNonogramHistory(limit = 20, cursor?: string) {
    const params: Record<string, string> = { limit: String(limit) };
    if (cursor) params.cursor = cursor;
    const res = await api<{ items: unknown[]; nextCursor: string | null }>(
      '/api/v1/nonogram/history',
      { params }
    );
    return res.payload;
  },

  async getNonogramStats() {
    const res = await api('/api/v1/nonogram/stats');
    return res.payload;
  },

  async getNonogramDailyHistory() {
    const res = await api('/api/v1/nonogram/daily/history');
    return res.payload;
  },

  async getNonogramDailyCompletion(date?: string) {
    const params = date ? { date } : {};
    const res = await api('/api/v1/nonogram/daily/completion', { params });
    return res.payload;
  },

  // ---- Tangram-specific endpoints ----

  async startTangramSession(puzzleId: string, difficulty: string) {
    const res = await api<{ sessionId: string; pieceStates: unknown[]; status: string }>(
      '/api/v1/tangram/session',
      { method: 'POST', body: JSON.stringify({ puzzleId, difficulty }) }
    );
    return res.payload;
  },

  async pauseTangramSession(sessionId: string) {
    const res = await api(`/api/v1/tangram/session/${sessionId}/pause`, { method: 'POST' });
    return res.payload;
  },

  async resumeTangramSession(sessionId: string) {
    const res = await api(`/api/v1/tangram/session/${sessionId}/resume`, { method: 'POST' });
    return res.payload;
  },

  async saveTangramProgress(
    sessionId: string,
    data: { pieceStates: unknown[]; elapsedSeconds: number; hintsUsed?: number; mistakes?: number }
  ) {
    const res = await api(`/api/v1/tangram/session/${sessionId}/save`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.payload;
  },

  async restartTangramSession(sessionId: string) {
    const res = await api(`/api/v1/tangram/session/${sessionId}/restart`, { method: 'POST' });
    return res.payload;
  },

  async replayTangramSession(sessionId: string) {
    const res = await api(`/api/v1/tangram/session/${sessionId}/replay`, { method: 'POST' });
    return res.payload;
  },

  async abandonTangramSession(sessionId: string, reason?: string) {
    const res = await api(`/api/v1/tangram/session/${sessionId}/abandon`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    return res.payload;
  },

  async verifyTangramSolution(sessionId: string, pieceStates: unknown[]) {
    const res = await api('/api/v1/tangram/verify', {
      method: 'POST',
      body: JSON.stringify({ sessionId, pieceStates }),
    });
    return res.payload;
  },

  async completeTangramPuzzle(
    sessionId: string,
    pieceStates: unknown[],
    elapsedSeconds: number,
    hintsUsed?: number,
    mistakes?: number
  ) {
    const res = await api('/api/v1/tangram/complete', {
      method: 'POST',
      body: JSON.stringify({ sessionId, pieceStates, elapsedSeconds, hintsUsed, mistakes }),
    });
    return res.payload;
  },

  async getTangramHistory(limit = 20, cursor?: string) {
    const params: Record<string, string> = { limit: String(limit) };
    if (cursor) params.cursor = cursor;
    const res = await api<{ items: unknown[]; nextCursor: string | null }>(
      '/api/v1/tangram/history',
      { params }
    );
    return res.payload;
  },

  async getTangramStats() {
    const res = await api('/api/v1/tangram/stats');
    return res.payload;
  },

  async getTangramDailyHistory() {
    const res = await api('/api/v1/tangram/daily/history');
    return res.payload;
  },

  async getTangramDailyCompletion(date?: string) {
    const params = date ? { date } : {};
    const res = await api('/api/v1/tangram/daily/completion', { params });
    return res.payload;
  },

  // ---- CrossMath-specific endpoints ----

  async startCrossMathSession(puzzleId: string) {
    const res = await api('/api/v1/crossmath/session', {
      method: 'POST', body: JSON.stringify({ puzzleId })
    });
    return res.payload;
  },

  async pauseCrossMathSession(sessionId: string) {
    const res = await api(`/api/v1/crossmath/session/${sessionId}/pause`, { method: 'POST' });
    return res.payload;
  },

  async resumeCrossMathSession(sessionId: string) {
    const res = await api(`/api/v1/crossmath/session/${sessionId}/resume`, { method: 'POST' });
    return res.payload;
  },

  async saveCrossMathProgress(
    sessionId: string,
    data: { grid: Record<string, number>; elapsedSeconds: number; hintsUsed?: number; mistakes?: number }
  ) {
    const res = await api(`/api/v1/crossmath/session/${sessionId}/save`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return res.payload;
  },

  async restartCrossMathSession(sessionId: string) {
    const res = await api(`/api/v1/crossmath/session/${sessionId}/restart`, { method: 'POST' });
    return res.payload;
  },

  async replayCrossMathSession(sessionId: string) {
    const res = await api(`/api/v1/crossmath/session/${sessionId}/replay`, { method: 'POST' });
    return res.payload;
  },

  async abandonCrossMathSession(sessionId: string) {
    const res = await api(`/api/v1/crossmath/session/${sessionId}/abandon`, { method: 'POST' });
    return res.payload;
  },

  async verifyCrossMathGrid(sessionId: string, grid: Record<string, number>) {
    const res = await api('/api/v1/crossmath/verify', {
      method: 'POST',
      body: JSON.stringify({ sessionId, grid }),
    });
    return res.payload;
  },

  async completeCrossMathPuzzle(
    sessionId: string,
    grid: Record<string, number>,
    elapsedSeconds: number,
    hintsUsed?: number,
    mistakes?: number
  ) {
    const res = await api('/api/v1/crossmath/complete', {
      method: 'POST',
      body: JSON.stringify({ sessionId, grid, elapsedSeconds, hintsUsed, mistakes }),
    });
    return res.payload;
  },

  async getCrossMathHistory(limit = 20, difficulty?: string, status?: string) {
    const params: Record<string, string> = { limit: String(limit) };
    if (difficulty) params.difficulty = difficulty;
    if (status) params.status = status;
    const res = await api('/api/v1/crossmath/history', { params });
    return res.payload;
  },

  async getCrossMathStats() {
    const res = await api('/api/v1/crossmath/stats');
    return res.payload;
  },

  async getCrossMathDailyHistory() {
    const res = await api('/api/v1/crossmath/daily/history');
    return res.payload;
  },

  async getCrossMathDailyCompletion(date?: string) {
    const params = date ? { date } : {};
    const res = await api('/api/v1/crossmath/daily/completion', { params });
    return res.payload;
  },
};

function todayString(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
