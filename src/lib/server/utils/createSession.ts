import { NextRequest } from "next/server";
import crypto from "crypto";
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

function getDeviceFingerprint(request: NextRequest): string | null {
  const header = request.headers.get("x-device-fingerprint");
  if (header) return header;
  const ua = request.headers.get("user-agent");
  if (ua) return crypto.createHash("sha256").update(ua).digest("hex").substring(0, 32);
  return null;
}

export async function createSession(request: NextRequest, userId: string, provider?: string, markOthersInactive = true, remember = true) {
  const ip = getClientIp(request);
  const ua = request.headers.get("user-agent");
  const parsed = parseUserAgent(ua);
  const deviceFingerprint = getDeviceFingerprint(request);

  const [location] = await Promise.all([
    geoLocate(ip),
    markOthersInactive
      ? LoginSession.updateMany({ userId, isCurrent: true }, { isCurrent: false })
      : Promise.resolve(),
  ]);

  const sessionData = {
    userId,
    ip,
    userAgent: ua,
    browser: parsed.browser,
    os: parsed.os,
    deviceType: parsed.deviceType,
    location,
    isCurrent: true,
    provider: provider || null,
    remember,
    lastSeenAt: new Date(),
    deviceFingerprint,
    status: "active" as const,
  };

  if (deviceFingerprint) {
    // Reuse the existing active session for this device, but NEVER reset
    // tokenVersion: doing so silently invalidates refresh tokens already
    // issued to other tabs/windows of this session, which forces a
    // token_reused logout minutes later.
    const existing = await LoginSession.findOneAndUpdate(
      { userId, deviceFingerprint, status: "active" },
      { $set: sessionData },
      { new: true },
    );
    if (existing) return existing;
  }

  const session = await LoginSession.create(sessionData);
  return session;
}

export async function markSessionSeen(userId: string) {
  await LoginSession.findOneAndUpdate(
    { userId, isCurrent: true },
    { lastSeenAt: new Date() },
  );
}
