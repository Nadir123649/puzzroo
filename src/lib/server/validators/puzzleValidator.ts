import { z } from "zod";

export const GAME_IDS = ["sudoku", "nonogram", "crossmath", "tangram"] as const;
export const DIFFICULTIES = ["easy", "medium", "hard", "expert"] as const;
export const PROGRESS_DIFFICULTIES = ["easy", "medium", "hard"] as const;

export const gameIdSchema = z.enum(GAME_IDS);
export const difficultySchema = z.enum(DIFFICULTIES);

/** GET /api/v1/games/[game]/puzzle — play (random) or fetch by id / date. */
export const getPuzzleQuerySchema = z.object({
  difficulty: difficultySchema.optional(),
  exclude: z.string().optional(),
  id: z.string().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
    .optional(),
});

/** GET /api/v1/games/[game]/puzzles — paginated catalog listing. */
export const listPuzzlesQuerySchema = z.object({
  difficulty: difficultySchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

/** GET /api/v1/games/[game]/leaderboard */
export const leaderboardQuerySchema = z.object({
  difficulty: z.enum(PROGRESS_DIFFICULTIES).optional(),
  period: z.enum(["all", "week", "month"]).default("all"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
});

/** POST /api/v1/games/progress — save in-progress or completed state. */
export const saveProgressSchema = z.object({
  gameId: gameIdSchema,
  puzzleId: z.string().min(1),
  difficulty: z.enum(PROGRESS_DIFFICULTIES),
  completed: z.boolean().optional(),
  score: z.number().min(0).optional(),
  time: z.number().min(0).optional(),
  hintsUsed: z.number().min(0).optional(),
  mistakes: z.number().min(0).optional(),
  moves: z.number().min(0).optional(),
  resumeState: z.any().optional(),
});

/** POST /api/v1/games/[game]/complete — mark completion + analytics. */
export const completeSchema = z.object({
  puzzleId: z.string().min(1),
  difficulty: z.enum(PROGRESS_DIFFICULTIES),
  score: z.number().min(0).optional(),
  time: z.number().min(0).optional(),
  hintsUsed: z.number().min(0).optional(),
  mistakes: z.number().min(0).optional(),
  moves: z.number().min(0).optional(),
});
