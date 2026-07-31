import { NextRequest } from "next/server";

const MAX_BODY_SIZE = parseInt(process.env.MAX_BODY_SIZE || "524288", 10); // 512KB default

/**
 * Reject requests whose Content-Length exceeds the configured limit.
 * Returns null if the request is OK, or an error message string to reject.
 */
export function validateBodySize(request: NextRequest): string | null {
  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
    return `Request body too large. Maximum is ${Math.round(MAX_BODY_SIZE / 1024)}KB.`;
  }
  return null;
}

/** Build Cache-Control headers for a given max-age in seconds. */
export function cacheHeaders(seconds: number): Record<string, string> {
  return {
    "Cache-Control": `public, max-age=${seconds}, stale-while-revalidate=${Math.floor(seconds / 2)}`,
  };
}

interface Bucket {
  count: number;
  limit: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter: number;
}

/**
 * Tiny in-memory sliding-window rate limiter (per key). Good enough for a
 * single-instance deployment; swap for Redis in a multi-instance setup.
 */
export function checkRateLimit(
  request: NextRequest,
  key: string,
  limit = 60,
  windowMs = 60_000
): RateLimitResult {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const bucketKey = `${key}:${ip}`;
  const now = Date.now();
  const bucket = buckets.get(bucketKey);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, limit, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs, retryAfter: 0 };
  }

  if (bucket.count >= bucket.limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt, retryAfter: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { allowed: true, remaining: bucket.limit - bucket.count, resetAt: bucket.resetAt, retryAfter: 0 };
}

/** Backward-compat: returns true if the request is allowed. */
export function rateLimit(
  request: NextRequest,
  key: string,
  limit = 60,
  windowMs = 60_000
): boolean {
  return checkRateLimit(request, key, limit, windowMs).allowed;
}

/** Extract client IP from request headers. */
export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
