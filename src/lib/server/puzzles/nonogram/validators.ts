import { z } from "zod"

export const nonogramDifficultySchema = z.enum(["easy", "medium", "hard", "expert"])

export const startSessionSchema = z.object({
  puzzleId: z.string().min(1, "puzzleId is required"),
})

export const saveProgressSchema = z.object({
  grid: z.array(z.array(z.enum(["empty", "filled", "marked", "crossed"]))),
  elapsedTime: z.number().min(0),
  hintsUsed: z.number().min(0),
  mistakes: z.number().min(0),
  moves: z.number().min(0),
})

export const verifyGridSchema = z.object({
  grid: z.array(z.array(z.enum(["empty", "filled", "marked", "crossed"]))),
})

export const completeSessionSchema = z.object({
  grid: z.array(z.array(z.enum(["empty", "filled", "marked", "crossed"]))),
  elapsedTime: z.number().min(0),
  hintsUsed: z.number().min(0),
  mistakes: z.number().min(0),
  moves: z.number().min(0),
  score: z.number().min(0),
})

export const abandonSessionSchema = z.object({
  reason: z.string().optional(),
})

export const replaySessionSchema = z.object({
  puzzleId: z.string().min(1, "puzzleId is required"),
})

export const sessionHistoryQuerySchema = z.object({
  status: z.enum(["playing", "paused", "completed", "abandoned"]).optional(),
  difficulty: nonogramDifficultySchema.optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  skip: z.coerce.number().min(0).default(0),
})

export const dailyQuerySchema = z.object({
  difficulty: nonogramDifficultySchema.optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD").optional(),
})
