import { NextRequest, NextResponse } from "next/server";
import AnalyticsEvent from "@/lib/server/models/AnalyticsEvent";
import User from "@/lib/server/models/User";
import LoginSession from "@/lib/server/models/LoginSession";
import { connectDB } from "@/lib/server/db";
import { auth } from "@/lib/server/middleware/auth";
import { buildRequestContext } from "@/lib/server/utils/requestContext";
import { trackBatchSchema } from "@/lib/server/validators/trackValidator";

// Fast, resilient analytics ingestion. Never throws to the client and always
// returns quickly — tracking must never degrade the user experience.
export async function POST(request: NextRequest) {
  try {
    let body: any = {};
    try {
      const text = await request.text();
      if (text) body = JSON.parse(text);
    } catch {
      return NextResponse.json({ success: true, accepted: 0 }, { status: 202 });
    }

    const parsed = trackBatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: true, accepted: 0 }, { status: 202 });
    }

    // Optional auth: attach a verified userId when a valid token is present.
    let userId: string | null = null;
    const authResult = await auth(request);
    if (!("error" in authResult)) userId = authResult.user.id;

    await connectDB();

    // Enrich context server-side (IP / UA / geo). Client values are page-only.
    const ctx = await buildRequestContext(request);

    // Link to the current device/login session for authenticated users.
    let loginSessionId: any = null;
    if (userId) {
      const session = await LoginSession.findOne({ userId, isCurrent: true })
        .sort({ lastSeenAt: -1 })
        .select("_id")
        .lean();
      if (session) loginSessionId = (session as any)._id;
    }

    const now = new Date();
    const docs = parsed.data.events.map((e) => ({
      userId: userId || null,
      anonymousId: e.anonymousId || null,
      sessionId: e.sessionId || null,
      loginSessionId,
      type: e.type,
      event: e.type === "page" ? "$pageview" : e.event || null,
      properties: e.properties || {},
      context: {
        path: e.path || null,
        url: e.url || null,
        referrer: e.referrer || null,
        title: e.title || null,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        browser: ctx.browser,
        os: ctx.os,
        deviceType: ctx.deviceType,
        location: ctx.location,
        locale: e.locale || null,
        screen: e.screen || null,
        source: "web",
      },
      timestamp: e.ts ? new Date(e.ts) : now,
    }));

    await AnalyticsEvent.insertMany(docs, { ordered: false });

    // Keep "last active" fresh for authenticated users (cheap, best-effort).
    if (userId) {
      await Promise.all([
        User.updateOne({ _id: userId }, { lastActiveAt: now }),
        LoginSession.updateOne({ userId, isCurrent: true }, { lastSeenAt: now }),
      ]);
    }

    return NextResponse.json({ success: true, accepted: docs.length }, { status: 202 });
  } catch (error: any) {
    console.error("[track] ingestion error:", error?.message || error);
    // Still 202 — never surface tracking failures to the client.
    return NextResponse.json({ success: true, accepted: 0 }, { status: 202 });
  }
}
