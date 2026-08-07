import GameProgress from "@/lib/server/models/GameProgress";
import { connectDB } from "@/lib/server/db";

export type CompletionGameId = "sudoku" | "crossmath" | "nonogram" | "tangram";

export interface CompletionInput {
  userId: string;
  gameId: CompletionGameId;
  puzzleId: string;
  difficulty: string;
  /** elapsed seconds on completion */
  time: number;
  hintsUsed?: number;
  mistakes?: number;
  moves?: number;
  score?: number;
}

/**
 * Idempotently record a completed game in GameProgress (the collection the
 * dashboard /api/v1/games/stats and leaderboards read from). The client also
 * syncs via POST /games/progress on win, but that is fire-and-forget — the
 * server-side record here makes "completed games" update even when a client
 * sync is dropped, throttled or raced by navigation.
 *
 * Users only: GameProgress requires a userId, so guest completions keep using
 * the client sync path (owner-less by design).
 */
export async function recordGameCompletion(input: CompletionInput): Promise<void> {
  await connectDB();
  await GameProgress.findOneAndUpdate(
    { userId: input.userId, gameId: input.gameId, puzzleId: input.puzzleId },
    {
      $set: {
        difficulty: input.difficulty,
        time: input.time,
        score: input.score || 0,
        completed: true,
        completedAt: new Date(),
      },
      $max: {
        hintsUsed: input.hintsUsed || 0,
        mistakes: input.mistakes || 0,
        moves: input.moves || 0,
      },
      $setOnInsert: {
        userId: input.userId,
        gameId: input.gameId,
        puzzleId: input.puzzleId,
      },
    },
    { upsert: true }
  );
}