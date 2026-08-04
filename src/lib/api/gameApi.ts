import { api } from "./client";
import type {
  SudokuPuzzleResponse,
  NonogramPuzzleResponse,
  CrossMathPuzzleResponse,
  TangramPuzzleResponse,
  PuzzleSummary,
  CatalogEntry,
} from "@/lib/server/puzzles/types";
import type {
  SaveProgressResponse,
  CompleteSessionResponse,
  ContinuePlayingInfo,
} from "@/lib/server/puzzles/crossmath/types";

export type GameId = "sudoku" | "nonogram" | "crossmath" | "tangram";

export interface GetPuzzleParams {
  difficulty?: string;
  exclude?: string;
  id?: string;
  date?: string;
  signal?: AbortSignal;
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
    const { signal, ...rest } = params;
    const res = await api<unknown>(`/api/v1/games/${game}/puzzle`, {
      params: rest as Record<string, string | number | boolean | undefined>,
      suppressToast: true,
      signal,
    });
    return res.payload as
      | SudokuPuzzleResponse
      | NonogramPuzzleResponse
      | CrossMathPuzzleResponse
      | TangramPuzzleResponse;
  },

  async getPuzzleById(game: GameId, id: string, signal?: AbortSignal) {
    const res = await api<unknown>(`/api/v1/games/${game}/puzzle/${encodeURIComponent(id)}`, {
      suppressToast: true,
      signal,
    });
    return res.payload as
      | SudokuPuzzleResponse
      | NonogramPuzzleResponse
      | CrossMathPuzzleResponse
      | TangramPuzzleResponse;
  },

  async getDailyPuzzle(game: GameId, date?: string, difficulty?: string, signal?: AbortSignal) {
    const params: Record<string, string> = {};
    if (date) params.date = date;
    if (difficulty) params.difficulty = difficulty;
    const res = await api<unknown>(`/api/v1/games/${game}/daily`, {
      params,
      suppressToast: true,
      signal,
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

  // ---- Session management (move-by-move sync) ----

  async createSession(game: GameId, puzzleId: string, difficulty?: string) {
    const res = await api(`/api/v1/games/${game}/sessions`, {
      method: 'POST',
      body: JSON.stringify({ puzzleId, difficulty }),
      suppressToast: true,
    });
    return res.payload;
  },

  async getContinueCrossMath(difficulty?: string) {
    const params = difficulty ? `?difficulty=${difficulty}` : '';
    const res = await api<ContinuePlayingInfo>(`/api/v1/games/crossmath/continue${params}`);
    return res.payload;
  },

  async getContinue(game: GameId, difficulty?: string) {
    const params = difficulty ? `?difficulty=${difficulty}` : '';
    const res = await api<any>(`/api/v1/games/${game}/continue${params}`);
    return res.payload;
  },

  async saveMove(game: GameId, sessionId: string, payload: Record<string, any>, signal?: AbortSignal) {
    const method = game === 'sudoku' ? 'PUT' : 'POST';
    const res = await api<{ payload: SaveProgressResponse }>(`/api/v1/games/${game}/sessions/${sessionId}/save`, {
      method,
      body: JSON.stringify(payload),
      signal,
      suppressToast: true,
    });
    return res.payload;
  },

  async completeSession(game: GameId, sessionId: string, payload: Record<string, any>) {
    const res = await api<{ payload: CompleteSessionResponse }>(`/api/v1/games/${game}/sessions/${sessionId}/complete`, {
      method: 'POST',
      body: JSON.stringify(payload),
      suppressToast: true,
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


  // ---- Tangram (and shared) session lifecycle ----

  async pauseSession(game: GameId, sessionId: string) {
    const res = await api(`/api/v1/games/${game}/sessions/${sessionId}/pause`, { method: 'PATCH' });
    return res.payload;
  },

  async resumeSession(game: GameId, sessionId: string) {
    const res = await api(`/api/v1/games/${game}/sessions/${sessionId}/resume`, { method: 'PATCH' });
    return res.payload;
  },

  async abandonSession(game: GameId, sessionId: string) {
    const res = await api(`/api/v1/games/${game}/sessions/${sessionId}/abandon`, { method: 'POST' });
    return res.payload;
  },

  async restartSession(game: GameId, sessionId: string) {
    const res = await api(`/api/v1/games/${game}/sessions/${sessionId}/restart`, { method: 'POST' });
    return res.payload;
  },

  async getCompletedPuzzles(game: GameId, params: { limit?: number; skip?: number } = {}) {
    const res = await api<{ sessions: any[]; total: number }>(`/api/v1/games/${game}/completed`, { params });
    return res.payload;
  },

  async getRecentSessions(game: GameId, limit = 10) {
    const res = await api<{ sessions: any[] }>(`/api/v1/games/${game}/recent`, { params: { limit } });
    return res.payload;
  },

  async getContinueDaily(game: GameId, dailyChallengeId: string) {
    const res = await api<{ hasActiveSession: boolean; session?: any }>(
      `/api/v1/games/${game}/daily/continue?dailyChallengeId=${encodeURIComponent(dailyChallengeId)}`
    );
    return res.payload;
  },

  async createDailySession(game: GameId, puzzleId: string, dailyChallengeId: string) {
    const res = await api(`/api/v1/games/${game}/daily/sessions`, {
      method: 'POST',
      body: JSON.stringify({ puzzleId, dailyChallengeId }),
      suppressToast: true,
    });
    return res.payload;
  },

  async getDailyCompletion(game: GameId, date?: string) {
    const params = date ? { date } : {};
    const res = await api(`/api/v1/games/${game}/daily/completion`, { params });
    return res.payload;
  },

  async getSession(game: GameId, sessionId: string) {
    const res = await api(`/api/v1/games/${game}/sessions/${sessionId}`, { suppressToast: true });
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

  async abandonSudokuSession(sessionId: string) {
    const res = await api(`/api/v1/games/sudoku/sessions/${sessionId}/abandon`, { method: 'POST' });
    return res.payload;
  },

  async replaySudokuSession(sessionId: string) {
    const res = await api(`/api/v1/games/sudoku/sessions/${sessionId}/replay`, { method: 'POST' });
    return res.payload;
  },

  async replayCrossMathSession(sessionId: string, puzzleId: string) {
    const res = await api(`/api/v1/games/crossmath/sessions/${sessionId}/replay`, {
      method: 'POST',
      body: JSON.stringify({ puzzleId }),
      suppressToast: true,
    });
    return res.payload;
  },

  async abandonCrossMathSession(sessionId: string) {
    const res = await api(`/api/v1/games/crossmath/sessions/${sessionId}/abandon`, { method: 'POST' });
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
    const res = await api('/api/v1/games/crossmath/daily/completion', { params });
    return res.payload;
  },

  // ---- Daily Challenge session management ----

  async createDailyCrossMathSession(puzzleId: string, dailyChallengeId: string) {
    const res = await api('/api/v1/games/crossmath/daily/sessions', {
      method: 'POST',
      body: JSON.stringify({ puzzleId, dailyChallengeId }),
      suppressToast: true,
    });
    return res.payload;
  },

  async getContinueDailySudoku() {
    const res = await api<any>('/api/v1/games/sudoku/daily/continue');
    return res.payload;
  },

  async getContinueDailyCrossMath(dailyChallengeId: string) {
    const res = await api<ContinuePlayingInfo>(
      `/api/v1/games/crossmath/daily/continue?dailyChallengeId=${encodeURIComponent(dailyChallengeId)}`
    );
    return res.payload;
  },
};
