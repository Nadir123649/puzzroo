import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/server/middleware/auth";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { rateLimit, getClientIpAttested, getClientIp } from "@/lib/server/utils/http";
import { type ClientHints } from "@/lib/server/utils/deviceInfo";
import { coordinatesSchema } from "@/lib/server/validators/locationValidator";
import { upsertGpsLocation, resolveIpLocation, getStoredGpsLocation, formatLocationLabel } from "@/lib/server/services/locationService";

type Owner = { userId: string | null; guestId: string | null };

// Ask browsers to disclose platform Client Hints on the next request, so the
// OS version can be detected accurately (e.g. Windows 10 vs 11).
const ACCEPT_CH = "sec-ch-ua-platform-version, sec-ch-ua-platform";

/**
 * GET  /api/v1/location — the caller's realtime client fingerprint:
 *   real public IP (proxy-aware), estimated location, and device info.
 *   Returns the stored GPS fix when one exists, otherwise a best-effort IP
 *   approximation (never persisted).
 * POST /api/v1/location — store a fresh browser-GPS fix for the caller,
 *   reverse-geocoded into city/region/country.
 */
export async function GET(request: NextRequest) {
  if (!rateLimit(request, "location", 30, 60_000)) {
    return errorResponse(429, "rate_limited", "Too many requests");
  }

  const { owner, error } = await resolveOwner(request);
  if (error) return error;

  // IP is proxy-derived when a reverse proxy (Vercel, Cloudflare, nginx) is in
  // front. On direct/headerless connections (localhost, some hosts) it falls
  // back to a browser-attested address from x-client-ip — flagged as such so
  // consumers know it was not proxy-derived.
  const { ip, clientAttested } = getClientIpAttested(request);
  const rawIpHeaders = ipHeaders(request);
  const clientHints = readClientHints(request);

  const shared = {
    ipAddress: ip,
    clientAttested,
    clientHints: {
      platform: clientHints.platform ?? null,
      platformVersion: clientHints.platformVersion ?? null,
    },
  };

  // With proxies (Vercel, Cloudflare, nginx) the public client IP rides on a
  // forwarded header. When we can't find one, surface exactly what arrived so
  // proxy misconfiguration is visible in the response itself.
  const diagnostics = ip === null ? { ipHeaders: rawIpHeaders, ipNote: ipNote(rawIpHeaders) } : undefined;

  const stored = await getStoredGpsLocation(owner);
  if (stored) {
    return respond(successResponse({
      ...shared,
      ...(diagnostics ?? {}),
      location: formatLocationLabel(stored),
      city: stored.city,
      region: stored.region,
      country: stored.country,
      latitude: stored.latitude,
      longitude: stored.longitude,
      coordinates: { latitude: stored.latitude, longitude: stored.longitude },
      accuracy: stored.accuracy,
      network: { isp: null, asn: null, connectionType: null },
      locationSource: "gps",
      provider: "gps",
      confidence: stored.confidence ?? 95,
      privacy: { gpsUsed: true, permissionRequired: false },
      timestamp: stored.timestamp.toISOString(),
    }), request);
  }

  const fallback = await resolveIpLocation(ip);
  if (!fallback) {
    return errorResponse(503, "location_unavailable", "Could not determine your location.");
  }
  return respond(successResponse({
    ...shared,
    ...(diagnostics ?? {}),
    location: formatLocationLabel(fallback),
    city: fallback.city,
    region: fallback.region,
    country: fallback.country,
    latitude: fallback.latitude,
    longitude: fallback.longitude,
    coordinates: { latitude: fallback.latitude, longitude: fallback.longitude },
    timezone: fallback.timezone,
    network: { isp: fallback.isp, asn: fallback.asn, connectionType: fallback.connectionType },
    locationSource: "ip",
    provider: fallback.provider,
    confidence: fallback.confidence,
    privacy: { gpsUsed: false, permissionRequired: false },
    timestamp: fallback.timestamp.toISOString(),
  }), request);
}

export async function POST(request: NextRequest) {
  if (!rateLimit(request, "location-gps", 30, 60_000)) {
    return errorResponse(429, "rate_limited", "Too many requests");
  }

  const { owner, error } = await resolveOwner(request);
  if (error) return error;

  let body: any = {};
  try { body = await request.json(); } catch {}

  const parsed = coordinatesSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return errorResponse(400, "validation_error", first ? first.message : "Invalid coordinates");
  }

  const result = await upsertGpsLocation(
    owner,
    { latitude: parsed.data.latitude, longitude: parsed.data.longitude, accuracy: parsed.data.accuracy ?? null },
    getClientIp(request)
  );
  return respond(successResponse(result, 201), request);
}

/** Attach Client-Hints + IP-diagnostics headers to the response. */
function respond(response: NextResponse, request: NextRequest): NextResponse {
  response.headers.set("Accept-CH", ACCEPT_CH);
  response.headers.set("x-puzzroo-debug", ipDebugHeader(request));
  return response;
}

/**
 * Echo the raw client-IP headers we just received. This is not a leak: it only
 * reflects values the caller itself sent. Always on so proxy misconfigurations
 * can be diagnosed from the live response.
 */
function ipDebugHeader(request: NextRequest): string {
  return [
    `cf=${request.headers.get("cf-connecting-ip")}`,
    `xff=${request.headers.get("x-forwarded-for")}`,
    `xreal=${request.headers.get("x-real-ip")}`,
    `fwd=${request.headers.get("forwarded")}`,
    `h2=${request.headers.get("x-forwarded-host")}`,
  ].join("; ");
}

function ipHeaders(request: NextRequest): Record<string, string | null> {
  return {
    cf: request.headers.get("cf-connecting-ip"),
    "x-forwarded-for": request.headers.get("x-forwarded-for"),
    "x-real-ip": request.headers.get("x-real-ip"),
    forwarded: request.headers.get("forwarded"),
    "x-forwarded-host": request.headers.get("x-forwarded-host"),
    host: request.headers.get("host"),
  };
}

/** Human-readable explanation of why no client IP could be gleaned. */
function ipNote(headers: Record<string, string | null>): string {
  const xff = headers["x-forwarded-for"];
  if (xff === "::1" || xff === "::ffff:127.0.0.1" || xff === "127.0.0.1" || xff === "localhost") {
    return "Request arrived over loopback (localhost) — no proxy hop means no client IP is transmitted. Test on the deployed URL, not localhost.";
  }
  if (headers.host === "localhost:3000" || headers.host?.startsWith("127.0.0.1") || headers.host === "localhost") {
    return "Request hit a local server — loopback connection carries no public client IP. Test on the deployed URL.";
  }
  return "No public client IP found in forwarded headers at origin (checked cf-connecting-ip, x-forwarded-for, x-real-ip, forwarded). Configure your proxy / CDN to forward the caller's IP, or serve behind a platform that does (Vercel, Cloudflare).";
}

function readClientHints(request: NextRequest): ClientHints {
  return {
    platform: request.headers.get("sec-ch-ua-platform"),
    // Chromium sends sec-ch-ua-platform-version after the Accept-CH
    // handshake; browsers without Client Hints (or first requests) get a
    // JS-attested fallback from x-ua-platform-version instead.
    platformVersion:
      request.headers.get("sec-ch-ua-platform-version") ||
      request.headers.get("x-ua-platform-version"),
  };
}

async function resolveOwner(request: NextRequest): Promise<{ owner: Owner; error?: Response }> {
  const authResult = await auth(request);
  if (!authResult.error) {
    return { owner: { userId: authResult.user.id, guestId: null } };
  }

  const guestId = request.headers.get("x-guest-id");
  if (guestId) {
    return { owner: { userId: null, guestId } };
  }

  return { owner: { userId: null, guestId: null }, error: authResult.error };
}
