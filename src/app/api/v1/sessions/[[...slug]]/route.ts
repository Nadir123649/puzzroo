import { NextRequest } from "next/server";
import LoginSession from "@/lib/server/models/LoginSession";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { auth, invalidateSessionCache } from "@/lib/server/middleware/auth";
import { geoLocate } from "@/lib/server/utils/geoLocate";

async function getUserId(request: NextRequest) {
  const result = await auth(request);
  if ("error" in result) return { error: result.error };
  return { userId: result.user.id, currentJti: result.user.jti };
}

async function resolveSessionLocation(s: any, isCurrent = false): Promise<string> {
  const force = isCurrent || !s.location || s.location === "Local Network" || s.location === "Unknown" || s.location === "Unknown Location";
  const loc = await geoLocate(s.ip || null, force);
  if (loc && loc !== "Unknown Location") {
    s.location = loc;
    LoginSession.updateOne({ _id: s._id }, { location: loc }).catch(() => {});
    return loc;
  }
  return s.location || "Unknown Location";
}

async function mapSessionAsync(s: any, currentJti?: string) {
  const isCurrentSession = currentJti ? s._id.toString() === currentJti : !!s.isCurrent;
  const location = await resolveSessionLocation(s, isCurrentSession);
  return {
    id: s._id.toString(),
    browser: s.browser,
    os: s.os,
    deviceType: s.deviceType,
    location,
    loginTime: s.createdAt,
    lastSeen: s.lastSeenAt,
    isCurrent: isCurrentSession,
    provider: s.provider,
    deviceFingerprint: s.deviceFingerprint,
    status: s.status,
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const slug = (await params).slug;
  const action = slug?.[0];

  await connectDB();

  const userResult = await getUserId(request);
  if ("error" in userResult) return userResult.error;

  const { userId, currentJti } = userResult;

  if (currentJti) {
    await LoginSession.updateOne({ _id: currentJti }, { lastSeenAt: new Date() }).catch(() => {});
  }

  try {
    // GET /api/v1/sessions/current
    if (action === "current") {
      const query = currentJti
        ? { _id: currentJti, userId, status: "active" }
        : { userId, isCurrent: true, status: "active" };
      const session = await LoginSession.findOne(query).lean();
      if (!session) return errorResponse(404, "not_found", "No current session found");
      const mapped = await mapSessionAsync(session, currentJti);
      return successResponse(mapped);
    }

    // GET /api/v1/sessions
    if (!action) {
      const sessions = await LoginSession.find({ userId, status: "active" })
        .sort({ lastSeenAt: -1 })
        .lean();
      const mappedSessions = await Promise.all(sessions.map((s) => mapSessionAsync(s, currentJti)));
      return successResponse(mappedSessions);
    }

    return errorResponse(404, "not_found", "Route not found");
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  await connectDB();

  const userResult = await getUserId(request);
  if ("error" in userResult) return userResult.error;

  const slug = (await params).slug;
  const sessionId = slug?.[0];

  try {
    // DELETE /api/v1/sessions — revoke all sessions
    if (!sessionId) {
      await LoginSession.updateMany({ userId: userResult.userId }, { status: "revoked", isCurrent: false });
      invalidateSessionCache();
      return successResponse({ message: "All sessions revoked successfully" });
    }

    // DELETE /api/v1/sessions/:id — revoke a specific session
    const session = await LoginSession.findOne({ _id: sessionId, userId: userResult.userId });
    if (!session) return errorResponse(404, "not_found", "Session not found");
    await session.updateOne({ status: "revoked", isCurrent: false });
    invalidateSessionCache(sessionId);
    return successResponse({ message: "Session revoked successfully" });
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
