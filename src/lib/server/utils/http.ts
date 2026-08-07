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
 * Normalize a raw IP header value: trim, drop a trailing :port, and unwrap
 * IPv4-mapped IPv6 addresses (::ffff:1.2.3.4 -> 1.2.3.4).
 * Returns null when the value is empty or clearly invalid.
 */
export function normalizeIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  let value = ip.trim();
  if (!value || value === "unknown" || value === "::" ) return null;
  // IPv4-mapped IPv6 (also some proxies write with uppercase "FFFF").
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(value);
  if (mapped) return mapped[1];
  // Drop a port suffix on IPv4 (e.g. "203.0.113.5:443").
  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(value)) {
    value = value.slice(0, value.lastIndexOf(":"));
  }
  if (value.includes(" ")) return null;
  // Loose sanity check: must look like IPv4 or IPv6.
  if (!/^[0-9a-fA-F:.]+$/.test(value)) return null;
  return value;
}

/**
 * True when the address is a routable public IP. Rejects loopback, private,
 * link-local, CGNAT and reserved ranges — the server must never treat its own
 * or a proxy-internal address as a client location.
 */
export function isPublicIp(ip: string | null | undefined): boolean {
  const normalized = normalizeIp(ip);
  if (!normalized) return false;

  if (normalized === "::1" || normalized === "::") return false;
  // IPv6 ULA (fc00::/7) and link-local (fe80::/10).
  if (/^f[cd][0-9a-f]{2}:|^fe[89ab][0-9a-f]:/i.test(normalized)) return false;

  // IPv4 private/reserved ranges.
  const v4 = normalized.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!v4) return true; // other IPv6 — assume public
  const [a, b] = [Number(v4[1]), Number(v4[2])];
  if (a === 0) return false; // 0.0.0.0/8
  if (a === 10) return false; // 10/8
  if (a === 127) return false; // loopback
  if (a === 169 && b === 254) return false; // link-local
  if (a === 172 && b >= 16 && b <= 31) return false; // 172.16/12
  if (a === 192 && b === 168) return false; // 192.168/16
  if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT 100.64/10
  return true;
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
  const ip = getClientIp(request);
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

/**
 * Parse an RFC 7239 Forwarded header ("Forwarded: for=203.0.113.7;proto=https,
 * for=\"192.0.2.43\"") and return the first "for" value, unwrapped.
 * Returns null when absent or unparsable.
 */
export function parseForwarded(header: string | null | undefined): string | null {
  if (!header) return null;
  const match = /(?:^|[,;\s])for=(?:"|\[)?([^";,\s\]]+)(?:"|\])?/i.exec(header);
  if (!match) return null;
  const value = match[1].replace(/^\[|\]$/g, "").trim();
  return value || null;
}

/** Return the first normalized public IP among the candidates, else null. */
function firstPublicIp(candidates: Array<string | null | undefined>): string | null {
  for (const c of candidates) {
    const normalized = normalizeIp(c);
    // Never treat proxy-internal / server addresses as the client.
    if (normalized && isPublicIp(normalized)) return normalized;
  }
  return null;
}

/**
 * Extract client IP from request, honouring proxy headers in priority order:
 * CF-Connecting-IP (Cloudflare) > X-Forwarded-For (every entry, leftmost
 * public wins) > X-Real-IP > RFC 7239 Forwarded > request.ip (socket).
 * Returns null when nothing usable is found.
 */
export function getClientIp(request: NextRequest): string | null {
  // NextRequest exposes `.ip` at runtime (socket address) but the type is
  // not shipped in all versions — read it defensively.
  const socketIp = (request as NextRequest & { ip?: string }).ip;
  const xff = request.headers.get("x-forwarded-for");
  const xffEntries = xff ? xff.split(",").map((s) => s.trim()) : [];

  return firstPublicIp([
    request.headers.get("cf-connecting-ip"),
    ...xffEntries,
    request.headers.get("x-real-ip"),
    parseForwarded(request.headers.get("forwarded")),
    socketIp,
  ]);
}

/**
 * Like getClientIp, but when no proxy header carries a public IP (direct
 * connections, localhost, header-stripping proxies) falls back to a
 * browser-attested address on x-client-ip. The attested address is only
 * honored if public — never private/loopback. Consumers MUST treat
 * clientAttested=true as non-authoritative (display-only fingerprint).
 */
export function getClientIpAttested(
  request: NextRequest
): { ip: string | null; clientAttested: boolean } {
  const proxied = getClientIp(request);
  if (proxied) return { ip: proxied, clientAttested: false };
  const attestedIp = firstPublicIp([request.headers.get("x-client-ip")]);
  if (attestedIp) return { ip: attestedIp, clientAttested: true };
  return { ip: null, clientAttested: false };
}
