import { z } from "zod";

export const sessionStartSchema = z.object({
  puzzleId: z.string().min(1, "puzzleId is required"),
  difficulty: z.enum(["easy", "medium", "hard", "expert"]),
});

export const sessionSaveSchema = z.object({
  grid: z.array(z.array(z.enum(["empty", "filled", "marked", "error"]))),
  elapsedSeconds: z.number().min(0),
  hintsUsed: z.number().min(0).optional(),
  mistakes: z.number().min(0).optional(),
});

export const sessionVerifySchema = z.object({
  grid: z.array(z.array(z.enum(["empty", "filled", "marked", "error"]))),
});

export const completeSessionSchema = z.object({
  isComplete: z.boolean(),
  accuracy: z.number().min(0).max(100),
  totalCells: z.number().min(0),
  correctCells: z.number().min(0),
});

export const sessionListQuerySchema = z.object({
  status: z.enum(["active", "paused", "completed", "abandoned"]).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  skip: z.coerce.number().min(0).default(0),
  sortBy: z.string().optional(),
  sortOrder: z.coerce.number().refine((v) => v === 1 || v === -1).optional(),
});

export const sessionIdParamSchema = z.object({
  id: z.string().min(1),
});

export const abandonSessionSchema = z.object({
  reason: z.string().optional(),
});

export const verifyTimingSchema = z.object({
  elapsedSeconds: z.number().min(0),
  estimatedTime: z.number().min(0),
});

export const dailyQuerySchema = z.object({
  difficulty: z.enum(["easy", "medium", "hard", "expert"]).optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
    .optional(),
});
