import { z } from 'zod';

const PIECE_IDS = [
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

export const verifyRequestSchema = z.object({
  sessionId: z.string().min(1),
  pieceStates: z.array(pieceStateSchema).length(7),
});

export const completeRequestSchema = z.object({
  sessionId: z.string().min(1),
  pieceStates: z.array(pieceStateSchema).length(7),
  elapsedSeconds: z.number().min(0),
  hintsUsed: z.number().min(0).optional(),
  mistakes: z.number().min(0).optional(),
});
