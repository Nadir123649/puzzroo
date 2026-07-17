import { NextRequest } from "next/server";
import LoginSession from "@/lib/server/models/LoginSession";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { auth } from "@/lib/server/middleware/auth";

function getUserId(request: NextRequest) {
  const result = auth(request);
  if ("error" in result) return { error: result.error };
  return { userId: result.user.id };
}

function mapSession(s: any) {
  return {
    id: s._id.toString(),
    browser: s.browser,
    os: s.os,
    deviceType: s.deviceType,
    location: s.location,
    loginTime: s.createdAt,
    lastSeen: s.lastSeenAt,
    isCurrent: s.isCurrent,
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const slug = (await params).slug;
  const action = slug?.[0];

  await connectDB();

  const userResult = getUserId(request);
  if ("error" in userResult) return userResult.error;

  try {
    // GET /api/v1/sessions/current
    if (action === "current") {
      const session = await LoginSession.findOne({ userId: userResult.userId, isCurrent: true })
        .sort({ lastSeenAt: -1 })
        .lean();
      if (!session) return errorResponse(404, "not_found", "No current session found");
      return successResponse(mapSession(session));
    }

    // GET /api/v1/sessions
    if (!action) {
      const sessions = await LoginSession.find({ userId: userResult.userId })
        .sort({ lastSeenAt: -1 })
        .lean();
      return successResponse(sessions.map(mapSession));
    }

    return errorResponse(404, "not_found", "Route not found");
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  await connectDB();

  const userResult = getUserId(request);
  if ("error" in userResult) return userResult.error;

  const slug = (await params).slug;
  const sessionId = slug?.[0];

  try {
    // DELETE /api/v1/sessions — revoke all sessions
    if (!sessionId) {
      await LoginSession.deleteMany({ userId: userResult.userId });
      return successResponse({ message: "All sessions revoked successfully" });
    }

    // DELETE /api/v1/sessions/:id — revoke a specific session
    const session = await LoginSession.findOne({ _id: sessionId, userId: userResult.userId });
    if (!session) return errorResponse(404, "not_found", "Session not found");
    await session.deleteOne();
    return successResponse({ message: "Session revoked successfully" });
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
