import { z } from "zod";

const eventSchema = z.object({
  type: z.enum(["page", "track", "identify"]).default("track"),
  event: z.string().trim().max(120).optional().nullable(),
  properties: z.record(z.string(), z.any()).optional(),
  anonymousId: z.string().trim().max(100).optional().nullable(),
  sessionId: z.string().trim().max(100).optional().nullable(),
  // client-supplied page context
  path: z.string().max(2048).optional().nullable(),
  url: z.string().max(2048).optional().nullable(),
  referrer: z.string().max(2048).optional().nullable(),
  title: z.string().max(512).optional().nullable(),
  locale: z.string().max(20).optional().nullable(),
  screen: z.string().max(40).optional().nullable(),
  ts: z.number().optional(),
});

export type TrackEventInput = z.infer<typeof eventSchema>;

export const trackBatchSchema = z.object({
  events: z.array(eventSchema).min(1).max(50),
});
