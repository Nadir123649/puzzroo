import { z } from 'zod';

export const PIECE_IDS = [
  'baseTriangle1',
  'baseTriangle2',
  'mediumTriangle',
  'smallTriangle1',
  'smallTriangle2',
  'square',
  'parallelogram',
] as const;

const pieceStateSchema = z.object({
  pieceId: z.enum(PIECE_IDS),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  rotation: z.number().min(0).max(360),
  flipped: z.boolean().default(false),
  placed: z.boolean().default(false),
});

export const startSessionSchema = z.object({
  puzzleId: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
});

export const saveSessionSchema = z.object({
  pieceStates: z.array(pieceStateSchema),
  elapsedSeconds: z.number().min(0),
  hintsUsed: z.number().min(0).optional(),
  mistakes: z.number().min(0).optional(),
});

export const abandonSessionSchema = z.object({
  reason: z.string().optional(),
});

export const sessionIdParamSchema = z.object({
  id: z.string().min(1),
});
