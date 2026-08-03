import { z } from "zod"

export const tangramDifficultySchema = z.enum(["easy", "medium", "hard"])

export const startSessionSchema = z.object({
  puzzleId: z.string().min(1, "puzzleId is required"),
})

const positionSchema = z.object({
  x: z.number().min(-10000).max(10000),
  y: z.number().min(-10000).max(10000),
})

const pieceStateSchema = z.object({
  pieceId: z.string().min(1).max(100),
  position: positionSchema,
  rotation: z.number().min(-720).max(720),
  flipped: z.boolean().optional(),
  placed: z.boolean().optional(),
  snapped: z.boolean().optional(),
})

export const pieceStatesSchema = z
  .array(pieceStateSchema)
  .min(1, "pieceStates must not be empty")
  .max(20, "pieceStates exceeds piece limit")

const timerFields = {
  elapsedTime: z.number().min(0).max(86400),
  hintsUsed: z.number().min(0).max(1000),
  mistakes: z.number().min(0).max(10000),
  moves: z.number().min(0).max(100000),
}

export const saveProgressSchema = z.object({
  pieceStates: pieceStatesSchema,
  ...timerFields,
})

export const completeSessionSchema = z.object({
  pieceStates: pieceStatesSchema,
  ...timerFields,
})

export const verifySessionSchema = z.object({
  pieceStates: pieceStatesSchema,
})

export const abandonSessionSchema = z.object({
  reason: z.string().max(500).optional(),
})

export const replaySessionSchema = z.object({
  puzzleId: z.string().min(1, "puzzleId is required"),
})

export const startDailySessionSchema = z.object({
  puzzleId: z.string().min(1, "puzzleId is required"),
  dailyChallengeId: z.string().min(1, "dailyChallengeId is required"),
})

export const sessionListQuerySchema = z.object({
  status: z.enum(["playing", "paused", "completed", "abandoned"]).optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  skip: z.coerce.number().min(0).default(0),
})

export const sessionHistoryQuerySchema = z.object({
  status: z.enum(["playing", "paused", "completed", "abandoned"]).optional(),
  difficulty: tangramDifficultySchema.optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  skip: z.coerce.number().min(0).default(0),
})

export const dailyQuerySchema = z.object({
  difficulty: tangramDifficultySchema.optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD").optional(),
})
