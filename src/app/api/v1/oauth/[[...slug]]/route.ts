import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import User from "@/lib/server/models/User";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { buildTokenPayload } from "@/lib/server/utils/generateTokens";
import { cookieOptions } from "@/lib/server/utils/cookieOptions";
import { authPayload, issueSession, handleOAuth } from "@/lib/server/utils/authHelpers";
import { auth } from "@/lib/server/middleware/auth";
import { trackServer } from "@/lib/server/utils/trackEvent";

const PROVIDER_MAP: Record<string, string> = {
  google: "google.com",
  facebook: "facebook.com",
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const slug = (await params).slug;
  const provider = slug?.[0];
  let body: any = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {}

  await connectDB();

  try {
    // ──── POST /api/v1/oauth/guest ────
    if (provider === "guest") {
      const guestId = crypto.randomBytes(4).toString("hex");
      const user = await User.create({ username: `guest_${guestId}`, usernameSet: true, role: "guest" });
      await trackServer({ userId: user._id.toString(), event: "login", properties: { method: "guest" }, request });
      const { payload } = await issueSession(request, user, "guest");
      return successResponse(payload, 201);
    }

    // ──── POST /api/v1/oauth/google | /api/v1/oauth/facebook ────
    const firebaseProvider = provider ? PROVIDER_MAP[provider] : undefined;
    if (firebaseProvider) {
      const { firebaseToken } = body;
      if (!firebaseToken) return errorResponse(400, "validation_error", "Firebase token is required");
      try {
        // If the caller is already signed in as a guest, hand the guest's id to
        // handleOAuth so it can convert that guest account in place (preserving
        // history) instead of spinning up a fresh account.
        const who = await auth(request);
        const currentUserId = !("error" in who) ? who.user.id : undefined;
        const result = await handleOAuth(firebaseProvider, firebaseToken, currentUserId, request);
        if (!result) return errorResponse(500, "firebase_not_configured", "Firebase is not configured");
        if (result.converted) {
          await trackServer({ userId: result.payload.user.id, event: "guest_converted", properties: { method: provider }, request });
        }
        await trackServer({ userId: result.payload.user.id, event: "login", properties: { method: provider }, request });
        const res = NextResponse.json({ success: true, payload: result.payload, timestamp: Date.now() }, { status: 200 });
        res.cookies.set("refreshToken", result.refreshToken, cookieOptions);
        return res;
      } catch (error: any) {
        if (error.code?.startsWith("auth/")) return errorResponse(401, "firebase_error", error.message);
        throw error;
      }
    }

    return errorResponse(404, "not_found", "Route not found");
  } catch (error: any) {
    console.error("[oauth] error:", error);
    const message =
      error?.code && String(error.code).startsWith("auth/")
        ? `Firebase auth error: ${error.code}`
        : error?.message || "Internal Server Error";
    return errorResponse(500, "internal_error", message);
  }
}
