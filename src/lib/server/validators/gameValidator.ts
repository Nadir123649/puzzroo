import { z } from "zod";

export const saveProgressSchema = z.object({
  gameId: z.enum(["sudoku", "crossmath", "nonogram", "tangram"]),
  puzzleId: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  profileId: z.string().optional(),
  status: z.enum(["not-started", "in-progress", "completed"]).optional(),
  completed: z.boolean().optional(),
  score: z.number().min(0).optional(),
  time: z.number().min(0).optional(),
  hintsUsed: z.number().min(0).optional(),
  mistakes: z.number().min(0).optional(),
  moves: z.number().min(0).optional(),
  resumeState: z.any().optional(),
});
