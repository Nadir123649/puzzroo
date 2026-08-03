import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { getRefreshCookieOptions } from "@/lib/server/utils/cookieOptions";
import { handleOAuth, isFirebaseReady } from "@/lib/server/utils/authHelpers";
import { getOrCreateGuestUser } from "@/lib/server/utils/guestUser";
import { transferGuestSessions } from "@/lib/server/utils/guestTransfer";
import { auth } from "@/lib/server/middleware/auth";
import { trackServer } from "@/lib/server/utils/trackEvent";
import { checkRateLimit } from "@/lib/server/utils/http";
import User from "@/lib/server/models/User";

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
    // ──── POST /api/v1/oauth/google | /api/v1/oauth/facebook ────
    const firebaseProvider = provider ? PROVIDER_MAP[provider] : undefined;
    if (firebaseProvider) {
      const rl = checkRateLimit(request, `oauth:${provider}`, 10, 60_000);
      if (!rl.allowed) return errorResponse(429, "rate_limit_exceeded", "Too many requests. Try again later.");
      const { firebaseToken } = body;
      const rememberMe = body.rememberMe === true;
      if (!firebaseToken) return errorResponse(400, "validation_error", "Firebase token is required");
      if (!isFirebaseReady()) {
        return errorResponse(503, "firebase_not_configured", "Firebase is not configured");
      }
      try {
        // If the caller is already signed in as a guest, hand the guest's id to
        // handleOAuth so it can convert that guest account in place (preserving
        // history) instead of spinning up a fresh account. Guests have no JWT,
        // so resolve their x-guest-id to a guest User doc first.
        const who = await auth(request);
        let currentUserId: string | undefined = !("error" in who) ? who.user.id : undefined;
        const guestId = request.headers.get("x-guest-id");
        if (!currentUserId && guestId) {
          const guest = await getOrCreateGuestUser(guestId);
          if (guest) currentUserId = guest._id.toString();
        }
        const result = await handleOAuth(firebaseProvider, firebaseToken, currentUserId, request, rememberMe);
        if (!result) return errorResponse(500, "firebase_not_configured", "Firebase is not configured");
        if (result.converted) {
          await trackServer({ userId: result.payload.user.id, event: "guest_converted", properties: { method: provider }, request });
        }
        // Transfer the browser's guest sessions to the account whenever that
        // account is the owner of the guest key — covers first conversion AND
        // later logins from the same browser with new guest play after logout.
        if (guestId) {
          const owner = await User.collection.findOne({ guestId }, { projection: { _id: 1 } });
          if (owner && owner._id.toString() === result.payload.user.id) {
            const transferred = await transferGuestSessions(guestId, result.payload.user.id);
            if (transferred > 0) {
              await trackServer({ userId: result.payload.user.id, event: "guest_sessions_transferred", properties: { count: transferred }, request });
            }
          }
        }
        await trackServer({ userId: result.payload.user.id, event: "login", properties: { method: provider }, request });
        const res = NextResponse.json({ success: true, payload: result.payload, timestamp: Date.now() }, { status: 200 });
        res.cookies.set("refreshToken", result.refreshToken, getRefreshCookieOptions(rememberMe));
        return res;
      } catch (error: any) {
        if (error?.code === "provider_mismatch") {
          return errorResponse(400, "provider_mismatch", "The sign-in provider does not match the Firebase token.");
        }
        if (String(error?.code ?? "").startsWith("auth/")) return errorResponse(401, "firebase_error", error.message);
        if (error?.code) return errorResponse(500, "internal_error", `Firebase error: ${error.code}`);
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
