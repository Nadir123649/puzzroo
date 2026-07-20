import { NextRequest } from "next/server";
import mongoose from "mongoose";
import AnalyticsEvent from "@/lib/server/models/AnalyticsEvent";
import User from "@/lib/server/models/User";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { auth } from "@/lib/server/middleware/auth";

// GET /api/v1/analytics/summary  (admin only)
// Lightweight first-party analytics dashboard data.
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const authResult = await auth(request);
  if ("error" in authResult) return authResult.error;
  if (authResult.user.role !== "admin") {
    return errorResponse(403, "forbidden", "Admin access required");
  }

  await connectDB();

  const slug = (await params).slug;
  const action = slug?.[0] || "summary";

  try {
    if (action === "summary") {
      const { searchParams } = new URL(request.url);
      const days = Math.min(Number(searchParams.get("days")) || 30, 365);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const [
        totalEvents,
        activeUsers,
        newSignups,
        logins,
        topEvents,
        recentEvents,
      ] = await Promise.all([
        AnalyticsEvent.countDocuments({ timestamp: { $gte: since } }),
        AnalyticsEvent.distinct("userId", { timestamp: { $gte: since }, userId: { $ne: null } }),
        AnalyticsEvent.countDocuments({ event: "signup_completed", timestamp: { $gte: since } }),
        AnalyticsEvent.countDocuments({ event: "login", timestamp: { $gte: since } }),
        AnalyticsEvent.aggregate([
          { $match: { timestamp: { $gte: since }, type: "track" } },
          { $group: { _id: "$event", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 15 },
        ]),
        AnalyticsEvent.find({ timestamp: { $gte: since } })
          .sort({ timestamp: -1 })
          .limit(50)
          .lean(),
      ]);

      const totalUsers = await User.countDocuments({});

      return successResponse({
        rangeDays: days,
        totals: {
          events: totalEvents,
          activeUsers: activeUsers.length,
          totalUsers,
          newSignups,
          logins,
        },
        topEvents: topEvents.map((e: any) => ({ event: e._id, count: e.count })),
        recentEvents: recentEvents.map((e: any) => ({
          id: e._id.toString(),
          userId: e.userId ? e.userId.toString() : null,
          type: e.type,
          event: e.event,
          path: e.context?.path || null,
          deviceType: e.context?.deviceType || null,
          location: e.context?.location || null,
          timestamp: e.timestamp,
        })),
      });
    }

    // GET /api/v1/analytics/user?q=<publicId|username|email|_id>&page=&limit=
    // Look up a single user by their unique id and return their tracking history.
    if (action === "user") {
      const { searchParams } = new URL(request.url);
      const q = (searchParams.get("q") || "").trim();
      if (!q) return errorResponse(400, "validation_error", "Search query is required");

      const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 50, 1), 200);
      const page = Math.max(Number(searchParams.get("page")) || 1, 1);
      const skip = (page - 1) * limit;

      // Match the unique account id whether typed with or without dashes,
      // and fall back to username / email / internal id for convenience.
      const digits = q.replace(/\D/g, "");
      const publicIdCandidates = [q];
      if (digits.length === 10) {
        publicIdCandidates.push(`${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}-${digits.slice(9)}`);
      }
      const or: any[] = [
        { publicId: { $in: publicIdCandidates } },
        { username: q.toLowerCase() },
        { email: q.toLowerCase() },
      ];
      if (mongoose.Types.ObjectId.isValid(q)) or.push({ _id: q });

      const target = await User.findOne({ $or: or }).select("-password").lean<any>();
      if (!target) return errorResponse(404, "user_not_found", "No user found for that id");

      const filter = { userId: target._id };
      const [events, totalEvents, byEvent, firstEvent] = await Promise.all([
        AnalyticsEvent.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
        AnalyticsEvent.countDocuments(filter),
        AnalyticsEvent.aggregate([
          { $match: filter },
          { $group: { _id: "$event", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 30 },
        ]),
        AnalyticsEvent.findOne(filter).sort({ timestamp: 1 }).select("timestamp").lean<any>(),
      ]);

      return successResponse({
        user: {
          id: target._id.toString(),
          publicId: target.publicId || null,
          username: target.username,
          name: target.name || null,
          email: target.email || null,
          role: target.role,
          provider: target.provider,
          status: target.status,
          avatar: target.avatar || null,
          createdAt: target.createdAt,
          lastLoginAt: target.lastLoginAt || null,
          lastActiveAt: target.lastActiveAt || null,
        },
        totalEvents,
        firstSeen: firstEvent?.timestamp || null,
        byEvent: byEvent.map((e: any) => ({ event: e._id || "(unknown)", count: e.count })),
        page,
        limit,
        hasMore: skip + events.length < totalEvents,
        events: events.map((e: any) => ({
          id: e._id.toString(),
          type: e.type,
          event: e.event,
          path: e.context?.path || null,
          url: e.context?.url || null,
          referrer: e.context?.referrer || null,
          ip: e.context?.ip || null,
          browser: e.context?.browser || null,
          os: e.context?.os || null,
          deviceType: e.context?.deviceType || null,
          location: e.context?.location || null,
          source: e.context?.source || null,
          properties: e.properties || {},
          timestamp: e.timestamp,
        })),
      });
    }

    return errorResponse(404, "not_found", "Route not found");
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}