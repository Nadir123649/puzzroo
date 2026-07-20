import { NextRequest } from "next/server";
import LoginSession from "@/lib/server/models/LoginSession";
import { parseUserAgent } from "@/lib/server/utils/parseUserAgent";
import { geoLocate } from "@/lib/server/utils/geoLocate";

function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  return null;
}

export async function createSession(request: NextRequest, userId: string, provider?: string, markOthersInactive = true) {
  const ip = getClientIp(request);
  const ua = request.headers.get("user-agent");
  const parsed = parseUserAgent(ua);

  const [location] = await Promise.all([
    geoLocate(ip),
    markOthersInactive
      ? LoginSession.updateMany({ userId, isCurrent: true }, { isCurrent: false })
      : Promise.resolve(),
  ]);

  const session = await LoginSession.create({
    userId,
    ip,
    userAgent: ua,
    browser: parsed.browser,
    os: parsed.os,
    deviceType: parsed.deviceType,
    location,
    isCurrent: true,
    provider: provider || null,
    lastSeenAt: new Date(),
  });

  return session;
}

export async function markSessionSeen(userId: string) {
  await LoginSession.findOneAndUpdate(
    { userId, isCurrent: true },
    { lastSeenAt: new Date() },
  );
}
