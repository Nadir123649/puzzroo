import { z } from "zod"

export const crossMathDifficultySchema = z.enum(["easy", "medium", "hard"])

export const startSessionSchema = z.object({
  puzzleId: z.string().min(1, "puzzleId is required"),
})

export const saveProgressSchema = z.object({
  grid: z.record(z.string(), z.number()),
  elapsedTime: z.number().min(0),
  hintsUsed: z.number().min(0).optional(),
  mistakes: z.number().min(0).optional(),
})

export const verifyGridSchema = z.object({
  grid: z.record(z.string(), z.number()),
})

export const sessionListQuerySchema = z.object({
  status: z.enum(["active", "paused", "completed", "abandoned"]).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  skip: z.coerce.number().min(0).default(0),
})

export const puzzleQuerySchema = z.object({
  difficulty: crossMathDifficultySchema.optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
})

export const dailyQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD").optional(),
  difficulty: crossMathDifficultySchema.optional(),
})

export const sessionHistoryQuerySchema = z.object({
  status: z.enum(["active", "paused", "completed", "abandoned"]).optional(),
  difficulty: crossMathDifficultySchema.optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  skip: z.coerce.number().min(0).default(0),
})

export const abandonSessionSchema = z.object({
  reason: z.string().optional(),
})

export const replaySessionSchema = z.object({
  puzzleId: z.string().min(1, "puzzleId is required"),
})

export const puzzleBrowserQuerySchema = z.object({
  difficulty: crossMathDifficultySchema.optional(),
  shapeName: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
})
