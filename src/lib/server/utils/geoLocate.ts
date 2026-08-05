// Geo lookups are best-effort and MUST never slow down API responses.
// Results are cached per-IP for 24h (city/country rarely change) and
// concurrent lookups for the same IP share one in-flight promise.

const PUBLIC_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const LOCAL_CACHE_TTL_MS = 10 * 1000; // 10s for local/dev connections so VPN changes are detected dynamically
const FETCH_TIMEOUT_MS = 2500;

const cache = new Map<string, { location: string; expiresAt: number }>();
const inFlight = new Map<string, Promise<string>>();

const isLocalIp = (ip: string | null): boolean => {
  if (!ip) return true;
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "localhost" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.16.") ||
    ip.startsWith("172.31.")
  );
};

export async function geoLocate(ip: string | null, forceRefresh = false): Promise<string> {
  const isLocal = isLocalIp(ip);
  const cacheKey = isLocal ? "self" : (ip as string);

  if (!forceRefresh) {
    const cached = cache.get(cacheKey);
    if (cached) {
      if (cached.expiresAt > Date.now()) return cached.location;
      cache.delete(cacheKey);
    }
  }

  const pending = inFlight.get(cacheKey);
  if (pending && !forceRefresh) return pending;

  const lookup = (async (): Promise<string> => {
    const targetUrlPrimary = isLocal ? "https://ipwho.is/" : `https://ipwho.is/${ip}`;
    const targetUrlFallback = isLocal ? "http://ip-api.com/json/" : `http://ip-api.com/json/${ip}?fields=city,country`;
    const ttl = isLocal ? LOCAL_CACHE_TTL_MS : PUBLIC_CACHE_TTL_MS;

    try {
      // Primary: ipwho.is (Free HTTPS API)
      const res = await fetch(targetUrlPrimary, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success !== false && (data.city || data.country)) {
          const loc = data.city && data.country ? `${data.city}, ${data.country}` : data.country;
          cache.set(cacheKey, { location: loc, expiresAt: Date.now() + ttl });
          return loc;
        }
      }
    } catch {
      // Fallback
    }

    try {
      // Fallback: http://ip-api.com/json (Free HTTP)
      const res = await fetch(targetUrlFallback, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.city || data.country) {
          const loc = data.city && data.country ? `${data.city}, ${data.country}` : data.country;
          cache.set(cacheKey, { location: loc, expiresAt: Date.now() + ttl });
          return loc;
        }
      }
    } catch {
      // Fallback failed
    }

    return "Unknown Location";
  })();

  inFlight.set(cacheKey, lookup);
  return lookup;
}

