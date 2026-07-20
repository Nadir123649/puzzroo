import { NextRequest } from "next/server";

/** Build Cache-Control headers for a given max-age in seconds. */
export function cacheHeaders(seconds: number): Record<string, string> {
  return {
    "Cache-Control": `public, max-age=${seconds}, stale-while-revalidate=${Math.floor(seconds / 2)}`,
  };
}

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Tiny in-memory sliding-window rate limiter (per key). Good enough for a
 * single-instance deployment; swap for Redis in a multi-instance setup.
 * Returns true if the request is allowed.
 */
export function rateLimit(
  request: NextRequest,
  key: string,
  limit = 60,
  windowMs = 60_000
): boolean {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const bucketKey = `${key}:${ip}`;
  const now = Date.now();
  const bucket = buckets.get(bucketKey);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}
