import { NextRequest } from "next/server";
import AnalyticsEvent from "@/lib/server/models/AnalyticsEvent";
import { buildRequestContext } from "@/lib/server/utils/requestContext";
import { connectDB } from "@/lib/server/db";

interface TrackServerArgs {
  userId?: string | null;
  event: string;
  properties?: Record<string, any>;
  request?: NextRequest;
  type?: "track" | "page" | "identify";
  anonymousId?: string | null;
  sessionId?: string | null;
}

/**
 * Records an analytics event from server-side code (auth flows, webhooks, etc.).
 * Fire-and-forget: any failure is swallowed so tracking can never break the
 * primary request. Callers may `await` it or not.
 */
export async function trackServer({
  userId = null,
  event,
  properties = {},
  request,
  type = "track",
  anonymousId = null,
  sessionId = null,
}: TrackServerArgs): Promise<void> {
  try {
    await connectDB();
    let context: Record<string, any> = { source: "server" };
    if (request) {
      const ctx = await buildRequestContext(request);
      context = {
        source: "server",
        path: request.nextUrl?.pathname ?? undefined,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        browser: ctx.browser,
        os: ctx.os,
        deviceType: ctx.deviceType,
        location: ctx.location,
      };
    }
    await AnalyticsEvent.create({
      userId: userId || null,
      anonymousId,
      sessionId,
      type,
      event,
      properties,
      context,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("[trackServer] failed:", (err as any)?.message || err);
  }
}
