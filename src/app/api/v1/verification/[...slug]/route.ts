import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import User from "@/lib/server/models/User";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { buildTokenPayload } from "@/lib/server/utils/generateTokens";
import { cookieOptions } from "@/lib/server/utils/cookieOptions";
import { sendVerificationEmail } from "@/lib/server/services/emailService";
import { getAuth } from "@/lib/server/config/firebase";
import { auth } from "@/lib/server/middleware/auth";
import { validate } from "@/lib/server/middleware/validate";
import { forgotPasswordSchema } from "@/lib/server/validators/authValidator";
import { formatUser } from "@/lib/server/utils/formatUser";
import { createSession } from "@/lib/server/utils/createSession";
import { isFirebaseReady, authPayload } from "@/lib/server/utils/authHelpers";
import { generateUniqueUsername } from "@/lib/server/utils/usernameGenerator";
import { trackServer } from "@/lib/server/utils/trackEvent";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const slug = (await params).slug || [];
  const resource = slug[0]; // "email" | "phone"
  const action = slug[1]; // "verify" | "resend"
  let body: any = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {}

  await connectDB();

  try {
    // ──── POST /api/v1/verification/email/verify ────
    if (resource === "email" && action === "verify") {
      const token = body.token;
      if (!token) return errorResponse(400, "validation_error", "Token is required");
      const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
      const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationTokenExpire: { $gt: Date.now() },
      });
      if (!user) return errorResponse(400, "token_invalid", "Invalid or expired verification token");
      user.isVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationTokenExpire = undefined;
      await user.save();
      return successResponse({ message: "Email verified successfully. You can now log in." });
    }

    // ──── POST /api/v1/verification/email/resend ────
    if (resource === "email" && action === "resend") {
      const val = validate(forgotPasswordSchema, body);
      if (val.error) return val.error;
      const { email } = val.data!;
      const user = await User.findOne({ email });
      if (!user) return errorResponse(404, "user_not_found", "No account found with this email");
      if (user.isVerified) return errorResponse(400, "already_verified", "Email is already verified");
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto.createHash("sha256").update(verificationToken).digest("hex");
      user.emailVerificationToken = hashedToken;
      user.emailVerificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000;
      await user.save({ validateBeforeSave: false });
      const verifyUrl = `${process.env.FRONTEND_URL}/api/v1/verification/email/verify/${verificationToken}`;
      try {
        await sendVerificationEmail(user.email, verifyUrl);
      } catch {
        user.emailVerificationToken = undefined;
        user.emailVerificationTokenExpire = undefined;
        await user.save({ validateBeforeSave: false });
        return errorResponse(500, "email_failed", "Failed to send verification email. Try again later.");
      }
      return successResponse({ message: "Verification email sent. Check your inbox." });
    }

    // ──── POST /api/v1/verification/phone ────
    if (resource === "phone") {
      if (!isFirebaseReady) return errorResponse(500, "firebase_not_configured", "Firebase is not configured");
      const { firebaseToken } = body;
      if (!firebaseToken) return errorResponse(400, "validation_error", "Firebase token is required");
      const decoded = await getAuth().verifyIdToken(firebaseToken);
      const phoneNumber = decoded.phone_number;
      if (!phoneNumber) return errorResponse(400, "no_phone", "No phone number in Firebase token");
      const userResult = auth(request);
      if (!("error" in userResult)) {
        const existingUser = await User.findOne({ phone: phoneNumber, _id: { $ne: userResult.user.id } });
        if (existingUser) return errorResponse(409, "phone_taken", "Phone number already linked to another account");
        const user = await User.findByIdAndUpdate(userResult.user.id, { phone: phoneNumber }, { new: true }).select("-password");
        return successResponse({ message: "Phone number verified and linked", user: formatUser(user) });
      }
      let user = await User.findOne({ phone: phoneNumber });
      if (!user) {
        const displayName = decoded.name || `User${phoneNumber.slice(-4)}`;
        const username = await generateUniqueUsername(displayName);
        user = await User.create({
          username,
          usernameSet: true,
          name: displayName,
          email: `${phoneNumber.replace(/\+/g, "")}@phone.puzzroo.com`,
          password: crypto.randomBytes(32).toString("hex"),
          phone: phoneNumber,
          isVerified: true,
          role: "free",
        });
      }
      user.lastLoginAt = new Date();
      await user.save({ validateBeforeSave: false });
      await createSession(request, user._id.toString());
      await trackServer({ userId: user._id.toString(), event: "login", properties: { method: "phone" }, request });
      const res = NextResponse.json({ success: true, payload: authPayload(user), timestamp: Date.now() }, { status: 200 });
      res.cookies.set("refreshToken", buildTokenPayload(user).refreshToken, cookieOptions);
      return res;
    }

    return errorResponse(404, "not_found", "Route not found");
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const slug = (await params).slug || [];
  const resource = slug[0]; // "email"
  const action = slug[1]; // "verify"
  const token = slug[2];

  await connectDB();

  try {
    // ──── GET /api/v1/verification/email/verify/:token (email link) ────
    if (resource === "email" && action === "verify") {
      if (!token) return NextResponse.redirect(new URL("/login?verified=false", process.env.FRONTEND_URL));
      const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
      const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationTokenExpire: { $gt: Date.now() },
      });
      if (!user) return NextResponse.redirect(new URL("/login?verified=false", process.env.FRONTEND_URL));
      user.isVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationTokenExpire = undefined;
      user.lastLoginAt = new Date();
      await user.save();
      // Auto-login: create a session and set the refresh cookie, then send the
      // user to a client interstitial that bootstraps the session and lands
      // them straight in the app (no manual login step).
      await createSession(request, user._id.toString());
      await trackServer({ userId: user._id.toString(), event: "email_verified", request });
      await trackServer({ userId: user._id.toString(), event: "login", properties: { method: "email_verify_autologin" }, request });
      const res = NextResponse.redirect(new URL("/auth/complete", process.env.FRONTEND_URL));
      res.cookies.set("refreshToken", buildTokenPayload(user).refreshToken, cookieOptions);
      return res;
    }

    return errorResponse(404, "not_found", "Route not found");
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
