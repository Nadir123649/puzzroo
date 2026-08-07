// Geo lookups are best-effort and MUST never slow down API responses.
// Results are cached per key; concurrent lookups for the same key share one
// in-flight promise. Provider calls never throw to the caller — each returns
// null on failure so consumers can degrade gracefully.

const IP_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const LOCAL_IP_CACHE_TTL_MS = 10 * 1000;
const REVERSE_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // city/region rarely move
const FETCH_TIMEOUT_MS = 3000;
const CACHE_MAX = 1000;

const ipCache = new Map<string, { value: LocationFromIp; expiresAt: number }>();
const reverseCache = new Map<string, { value: ReverseGeoResult; expiresAt: number }>();
const inFlightIp = new Map<string, Promise<LocationFromIp | null>>();
const inFlightReverse = new Map<string, Promise<ReverseGeoResult | null>>();

export interface ReverseGeoResult {
  city: string | null;
  region: string | null;
  country: string | null;
}

export interface LocationFromIp {
  latitude: number;
  longitude: number;
  city: string | null;
  region: string | null;
  country: string | null;
  timezone: string | null;
  isp: string | null;
  asn: string | null;
  /** Connection type when the provider reports it (e.g. "Fiber", "Cable"). */
  connectionType: string | null;
  /** Name of the provider that produced this result. */
  provider: string;
}

function prune<T>(map: Map<string, { expiresAt: number } & T>): void {
  const now = Date.now();
  for (const [k, v] of map) {
    if (v.expiresAt <= now) map.delete(k);
  }
  if (map.size > CACHE_MAX) {
    for (const [k] of [...map.entries()].slice(0, map.size - CACHE_MAX)) map.delete(k);
  }
}

const isLocalIp = (ip: string | null | undefined): boolean => {
  if (!ip) return true;
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "localhost" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  );
};

export function roundCoord(value: number, precision = 5): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor) / factor;
}

export function isValidCoords(latitude: number, longitude: number): boolean {
  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export function parseNominatimResponse(json: any): ReverseGeoResult {
  const addr = json?.address || {};
  return {
    city: addr.city || addr.town || addr.village || addr.municipality || addr.county || null,
    region: addr.state || addr.region || addr.state_district || null,
    country: addr.country || null,
  };
}

export function parseIpWhoIsResponse(json: any): LocationFromIp | null {
  if (!json || json.success === false) return null;
  const lat = Number(json.latitude);
  const lon = Number(json.longitude);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  const asn = json.connection?.asn;
  return {
    latitude: roundCoord(lat),
    longitude: roundCoord(lon),
    city: json.city || null,
    region: json.region || null,
    country: json.country || null,
    timezone: json.timezone?.id || null,
    isp: json.connection?.isp || null,
    asn: asn == null ? null : String(asn),
    connectionType: json.connection?.type || null,
    provider: "ipwhois",
  };
}

export function parseIpApiResponse(json: any): LocationFromIp | null {
  if (!json || json.status !== "success") return null;
  const lat = Number(json.lat);
  const lon = Number(json.lon);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  return {
    latitude: roundCoord(lat),
    longitude: roundCoord(lon),
    city: json.city || null,
    region: json.regionName || null,
    country: json.country || null,
    timezone: json.timezone || null,
    isp: json.isp || null,
    asn: json.as || null,
    connectionType: null,
    provider: "ip-api",
  };
}

/** ipapi.co (free HTTPS, ~1k req/day). */
export function parseIpApiCoResponse(json: any): LocationFromIp | null {
  if (!json || json.error) return null;
  const lat = Number(json.latitude);
  const lon = Number(json.longitude);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  const org = json.org || null;
  const asnMatch = typeof org === "string" ? /(AS\d+)/.exec(org) : null;
  return {
    latitude: roundCoord(lat),
    longitude: roundCoord(lon),
    city: json.city || null,
    region: json.region || null,
    country: json.country_name || null,
    timezone: json.timezone || null,
    isp: org,
    asn: asnMatch ? asnMatch[1] : null,
    connectionType: null,
    provider: "ipapi.co",
  };
}

/** ipinfo.io (free tier, opt-in via IPINFOIO_TOKEN env). */
export function parseIpInfoResponse(json: any): LocationFromIp | null {
  if (!json || json.bogon === true) return null;
  const loc = json.loc ? String(json.loc).split(",") : [];
  const lat = Number(loc[0]);
  const lon = Number(loc[1]);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null;
  const org = json.org || null;
  const asnMatch = typeof org === "string" ? /(AS\d+)/.exec(org) : null;
  return {
    latitude: roundCoord(lat),
    longitude: roundCoord(lon),
    city: json.city || null,
    region: json.region || null,
    country: json.country_name || json.country || null,
    timezone: json.timezone || null,
    isp: org,
    asn: asnMatch ? asnMatch[1] : null,
    connectionType: null,
    provider: "ipinfo",
  };
}

async function safeFetchJson(url: string, init?: RequestInit): Promise<any> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    ...init,
  });
  if (!res.ok) throw new Error(`geo request failed: ${res.status}`);
  return res.json();
}

/**
 * IP → approximate location (lat/lon + city/region/country).
 * Primary: ipwho.is (free HTTPS). Fallback: ip-api.com (free HTTP).
 * Returns null when the client is on a private/local address or no provider
 * responds — safe to use as the last-resort fallback.
 */
export async function lookupLocationFromIp(ip: string | null | undefined): Promise<LocationFromIp | null> {
  // "unknown" / private addresses mean "look me up" (server-side self lookup),
  // never a real client address — passing them to providers yields failures.
  const cleanIp = ip === "unknown" || ip === "localhost" || ip === "" ? null : ip;
  const isLocal = isLocalIp(cleanIp);
  const cacheKey = cleanIp && !isLocal ? cleanIp : "__self__";

  const cached = ipCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const ttl = isLocal ? LOCAL_IP_CACHE_TTL_MS : IP_CACHE_TTL_MS;

  const pending = inFlightIp.get(cacheKey);
  if (pending) return pending;

  const lookup = (async (): Promise<LocationFromIp | null> => {
    const suffix = cleanIp && !isLocal ? `/${cleanIp}` : "";

    // 1) ipwho.is (free HTTPS)
    try {
      const parsed = parseIpWhoIsResponse(await safeFetchJson(`https://ipwho.is${suffix}`));
      if (parsed) {
        ipCache.set(cacheKey, { value: parsed, expiresAt: Date.now() + ttl });
        return parsed;
      }
    } catch { /* next provider */ }

    // 2) ip-api.com (free HTTP, server-side fetch only)
    try {
      const parsed = parseIpApiResponse(await safeFetchJson(
        cleanIp && !isLocal
          ? `http://ip-api.com/json/${cleanIp}?fields=status,country,regionName,city,lat,lon,timezone,isp,org,as`
          : "http://ip-api.com/json/?fields=status,country,regionName,city,lat,lon,timezone,isp,org,as"
      ));
      if (parsed) {
        ipCache.set(cacheKey, { value: parsed, expiresAt: Date.now() + ttl });
        return parsed;
      }
    } catch { /* next provider */ }

    // 3) ipapi.co (free HTTPS)
    try {
      const parsed = parseIpApiCoResponse(await safeFetchJson(
        `https://ipapi.co${suffix}/json/`
      ));
      if (parsed) {
        ipCache.set(cacheKey, { value: parsed, expiresAt: Date.now() + ttl });
        return parsed;
      }
    } catch { /* next provider */ }

    // 4) ipinfo.io (opt-in, needs IPINFOIO_TOKEN env)
    const token = process.env.IPINFOIO_TOKEN;
    if (token) {
      try {
        const parsed = parseIpInfoResponse(await safeFetchJson(
          `https://ipinfo.io${suffix}/json`,
          { headers: { Authorization: `Bearer ${token}` } }
        ));
        if (parsed) {
          ipCache.set(cacheKey, { value: parsed, expiresAt: Date.now() + ttl });
          return parsed;
        }
      } catch { /* no geodata */ }
    }

    ipCache.delete(cacheKey);
    return null;
  })();

  inFlightIp.set(cacheKey, lookup);
  lookup.finally(() => { if (inFlightIp.get(cacheKey) === lookup) inFlightIp.delete(cacheKey); });
  return lookup;
}

/**
 * Nominatim (OpenStreetMap) reverse geocoding. Set `NOMINATIM_EMAIL` in env to
 * identify the app (their fair-use etiquette). Returns {city,region,country}
 * or null on any failure / permission-less coordinates.
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeoResult | null> {
  const lat = roundCoord(latitude);
  const lon = roundCoord(longitude);
  const cacheKey = `${lat},${lon}`;

  const cached = reverseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const pending = inFlightReverse.get(cacheKey);
  if (pending) return pending;

  const url = new URL(process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("zoom", "12");
  url.searchParams.set("addressdetails", "1");

  const appId = process.env.NOMINATIM_EMAIL ? ` (${process.env.NOMINATIM_EMAIL})` : "";

  const lookup = (async (): Promise<ReverseGeoResult | null> => {
    try {
      const parsed = parseNominatimResponse(await safeFetchJson(url.toString(), {
        headers: {
          Accept: "application/json",
          "User-Agent": `Puzzroo${appId}`,
          "Accept-Language": "en",
        },
      }));
      reverseCache.set(cacheKey, { value: parsed, expiresAt: Date.now() + REVERSE_CACHE_TTL_MS });
      return parsed;
    } catch {
      return null;
    }
  })();

  inFlightReverse.set(cacheKey, lookup);
  lookup.finally(() => { if (inFlightReverse.get(cacheKey) === lookup) inFlightReverse.delete(cacheKey); });
  return lookup;
}

/** Trim caches on an interval so a busy instance doesn't leak memory. */
export function pruneCaches(): void {
  prune(ipCache as Map<string, { expiresAt: number }>);
  prune(reverseCache as Map<string, { expiresAt: number }>);
}