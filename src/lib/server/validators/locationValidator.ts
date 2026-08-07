import { z } from "zod";

export const coordinatesSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(20_000).optional(),
  timestamp: z.coerce.date().optional(),
});

export type CoordinatesInput = z.infer<typeof coordinatesSchema>;

export const locationQuerySchema = z.object({
  force: z.coerce.boolean().optional(),
});