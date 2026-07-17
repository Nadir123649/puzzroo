import { NextRequest } from "next/server";
import AnalyticsEvent from "@/lib/server/models/AnalyticsEvent";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { auth } from "@/lib/server/middleware/auth";

function mapEvent(e: any) {
  return {
    id: e._id.toString(),
    type: e.type,
    event: e.event,
    properties: e.properties || {},
    path: e.context?.path || null,
    deviceType: e.context?.deviceType || null,
    browser: e.context?.browser || null,
    os: e.context?.os || null,
    location: e.context?.location || null,
    timestamp: e.timestamp,
  };
}

// GET /api/v1/users/me/activity?limit=20&page=1
export async function GET(request: NextRequest) {
  const authResult = auth(request);
  if ("error" in authResult) return authResult.error;

  await connectDB();

  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);
    const pageNum = Math.max(Number(searchParams.get("page")) || 1, 1);
    const skip = (pageNum - 1) * limit;

    const [events, total] = await Promise.all([
      AnalyticsEvent.find({ userId: authResult.user.id })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AnalyticsEvent.countDocuments({ userId: authResult.user.id }),
    ]);

    return successResponse({
      events: events.map(mapEvent),
      total,
      page: pageNum,
      limit,
      hasMore: skip + events.length < total,
    });
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
