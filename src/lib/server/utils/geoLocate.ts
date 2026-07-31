// Geo lookups are best-effort and MUST never slow down API responses.
// Results are cached per-IP for 24h (city/country rarely change) and
// concurrent lookups for the same IP share one in-flight promise.

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 1500;

const cache = new Map<string, { location: string | null; expiresAt: number }>();
const inFlight = new Map<string, Promise<string | null>>();

export async function geoLocate(ip: string | null): Promise<string | null> {
  if (!ip || ip === "127.0.0.1" || ip === "::1" || ip === "localhost" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
    return null;
  }

  const cached = cache.get(ip);
  if (cached) {
    if (cached.expiresAt > Date.now()) return cached.location;
    cache.delete(ip);
  }

  const pending = inFlight.get(ip);
  if (pending) return pending;

  const lookup = (async () => {
    try {
      const res = await fetch(
        `https://ip-api.com/json/${ip}?fields=city,country`,
        { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const location = data.city && data.country
        ? `${data.city}, ${data.country}`
        : data.country || null;
      cache.set(ip, { location, expiresAt: Date.now() + CACHE_TTL_MS });
      return location;
    } catch {
      return null;
    } finally {
      inFlight.delete(ip);
    }
  })();

  inFlight.set(ip, lookup);
  return lookup;
}
