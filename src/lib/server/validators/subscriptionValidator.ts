import { z } from "zod";

export const createCheckoutSchema = z.object({
  planId: z.enum(["monthly", "yearly", "lifetime"], { message: "Invalid plan" }),
});
