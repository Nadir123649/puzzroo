import { z } from "zod"

export const tangramDifficultySchema = z.enum(["easy", "medium", "hard"])

export const startSessionSchema = z.object({
  puzzleId: z.string().min(1, "puzzleId is required"),
  difficulty: tangramDifficultySchema.optional(),
})

const positionSchema = z.object({
  x: z.coerce.number().min(-10000).max(10000),
  y: z.coerce.number().min(-10000).max(10000),
})

const pieceStateSchema = z.object({
  pieceId: z.string().min(1).max(100),
  position: positionSchema,
  rotation: z.coerce.number().min(-720).max(720),
  flipped: z.boolean().optional(),
  placed: z.boolean().optional(),
  snapped: z.boolean().optional(),
})

export const pieceStatesSchema = z
  .array(pieceStateSchema)
  .min(1, "pieceStates must not be empty")
  .max(20, "pieceStates exceeds piece limit")

const optionalNumberField = (max = 100000) =>
  z.coerce.number().min(0).max(max).default(0).optional().transform((val) => val ?? 0)

const elapsedSecondsField = z.preprocess(
  (val, ctx) => {
    if (val !== undefined && val !== null) return val
    const parent = (ctx as any)?.parent
    if (parent && parent.elapsedTime !== undefined) return parent.elapsedTime
    return 0
  },
  z.coerce.number().min(0).max(86400).default(0)
)

export const saveProgressSchema = z.object({
  pieceStates: pieceStatesSchema,
  elapsedSeconds: elapsedSecondsField,
  elapsedTime: z.coerce.number().min(0).max(86400).optional(),
  hintsUsed: optionalNumberField(1000),
  mistakes: optionalNumberField(10000),
  moves: optionalNumberField(100000),
})

export const completeSessionSchema = z.object({
  pieceStates: pieceStatesSchema,
  elapsedSeconds: elapsedSecondsField,
  elapsedTime: z.coerce.number().min(0).max(86400).optional(),
  hintsUsed: optionalNumberField(1000),
  mistakes: optionalNumberField(10000),
  moves: optionalNumberField(100000),
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
