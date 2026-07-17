import { z } from "zod";

export const saveProgressSchema = z.object({
  gameId: z.enum(["sudoku", "crossmath", "nonogram", "tangram"]),
  puzzleId: z.string().min(1),
  difficulty: z.enum(["easy", "medium", "hard"]),
  completed: z.boolean().optional(),
  score: z.number().min(0).optional(),
  time: z.number().min(0).optional(),
});
