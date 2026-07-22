import { z } from "zod";

const difficultyEnum = z.enum(["easy", "medium", "hard", "expert"]);
const board81Regex = /^[0-9]{81}$/;

export const createSessionSchema = z.object({
  puzzleId: z.string().min(1, "puzzleId is required"),
  difficulty: difficultyEnum.optional(),
});

export const saveProgressSchema = z.object({
  board: z.string().regex(board81Regex, "board must be 81-char string (0-9)"),
  notes: z.array(z.array(z.string())).length(9).optional(),
  elapsedTime: z.number().min(0).max(86400).default(0),
});

export const verifyMoveSchema = z.object({
  row: z.number().int().min(0).max(8),
  col: z.number().int().min(0).max(8),
  value: z.number().int().min(1).max(9),
});

export const verifyCompletionSchema = z.object({
  board: z.string().regex(board81Regex, "board must be 81-char string (0-9)"),
});

export const completeSessionSchema = z.object({
  board: z.string().regex(board81Regex, "board must be 81-char string (0-9)"),
  elapsedTime: z.number().min(0).max(86400),
});

export const historyQuerySchema = z.object({
  status: z.enum(["completed", "abandoned"]).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const dailyPuzzleQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD").optional(),
});

export const randomPuzzleQuerySchema = z.object({
  difficulty: difficultyEnum.optional(),
  exclude: z.string().optional(),
});

export const puzzleByIdSchema = z.object({
  id: z.string().min(1),
});
