import { z } from "zod";

export const updateEmailPreferenceSchema = z.object({
  updates: z.boolean().optional(),
  dailyChallenge: z.boolean().optional(),
  competition: z.boolean().optional(),
  tips: z.boolean().optional(),
  security: z.boolean().optional(),
});
