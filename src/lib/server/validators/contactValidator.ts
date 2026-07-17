import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Please enter a valid email"),
  message: z.string().trim().min(10, "Message must be at least 10 characters"),
});
