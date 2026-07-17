import { NextRequest } from "next/server";
import { parseUserAgent } from "@/lib/server/utils/parseUserAgent";
import { geoLocate } from "@/lib/server/utils/geoLocate";

export function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  return null;
}

export interface RequestContext {
  ip: string | null;
  userAgent: string | null;
  browser: string;
  os: string;
  deviceType: string;
  location: string | null;
}

/**
 * Extracts device + geo context from an incoming request. Reuses the same
 * IP / user-agent / geo utilities as login-session creation so tracking
 * context is consistent across the app.
 */
export async function buildRequestContext(request: NextRequest): Promise<RequestContext> {
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent");
  const parsed = parseUserAgent(userAgent);
  const location = await geoLocate(ip);
  return {
    ip,
    userAgent,
    browser: parsed.browser,
    os: parsed.os,
    deviceType: parsed.deviceType,
    location,
  };
}
