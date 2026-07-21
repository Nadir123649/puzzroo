import { api } from "@/lib/api/client";

export type GameId = "sudoku" | "crossmath" | "nonogram" | "tangram";

export interface ProgressPayload {
  gameId: GameId;
  puzzleId: string;
  difficulty: "easy" | "medium" | "hard";
  profileId?: string | null;
  status?: "not-started" | "in-progress" | "completed";
  completed?: boolean;
  score?: number;
  time?: number;
  hintsUsed?: number;
  mistakes?: number;
  moves?: number;
  resumeState?: unknown;
}

/**
 * Persist a puzzle's in-progress / completed state to MongoDB, keyed by the
 * exact puzzleId. This is the server source of truth that lets a past puzzle
 * keep its own board + progress instead of overwriting a single slot.
 */
export async function saveProgress(payload: ProgressPayload): Promise<void> {
  try {
    await api("/api/v1/games/progress", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch {
    // Progress is best-effort — never block gameplay on a failed save.
  }
}

/**
 * Load a single puzzle's saved state (board, score, status) by puzzleId.
 * Returns null when nothing is stored (fresh puzzle).
 */
export async function loadProgress(
  gameId: GameId,
  puzzleId: string,
  profileId?: string | null
): Promise<Record<string, any> | null> {
  try {
    const params = new URLSearchParams({ gameId, puzzleId });
    if (profileId) params.set("profileId", profileId);
    const res = await api(`/api/v1/games/progress?${params.toString()}`);
    if (!res.success) return null;
    return (res.payload as any) || null;
  } catch {
    return null;
  }
}

/**
 * Load all saved statuses for a game (used by the Past Puzzles grid to show
 * in-progress / completed without re-deriving from localStorage).
 */
export async function loadProgressList(
  gameId: GameId,
  profileId?: string | null
): Promise<Record<string, any>[]> {
  try {
    const params = new URLSearchParams({ gameId });
    if (profileId) params.set("profileId", profileId);
    const res = await api(`/api/v1/games/progress/list?${params.toString()}`);
    if (!res.success) return [];
    return (res.payload as any) || [];
  } catch {
    return [];
  }
}
