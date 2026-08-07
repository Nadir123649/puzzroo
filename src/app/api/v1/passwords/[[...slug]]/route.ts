import { NextRequest } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "@/lib/server/models/User";
import LoginSession from "@/lib/server/models/LoginSession";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse, getOrigin } from "@/lib/server/utils/apiResponse";
import { sendResetPasswordEmail } from "@/lib/server/services/emailService";
import { validate } from "@/lib/server/middleware/validate";
import { invalidateSessionCache } from "@/lib/server/middleware/auth";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/server/validators/authValidator";
import { trackServer } from "@/lib/server/utils/trackEvent";
import { checkRateLimit } from "@/lib/server/utils/http";

// Reset links live long enough to survive slow email delivery; they are
// single-use and die instantly on first consumption.
const RESET_TOKEN_MINUTES = 60;

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ──── GET /api/v1/passwords/reset?token=... ────
// Lets the reset-password page check link validity BEFORE showing the form.
// An expired/unknown token must surface the "Link Expired" state immediately
// instead of letting the user type a new password and only then failing.
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const slug = (await params).slug;
  const action = slug?.[0];
  if (action !== "reset") return errorResponse(404, "not_found", "Route not found");

  const token = request.nextUrl.searchParams.get("token");
  if (!token) return errorResponse(400, "validation_error", "Token is required");

  try {
    await connectDB();
    const hashedToken = hashToken(token);
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordTokenExpire: { $gt: Date.now() },
    });
    return successResponse({ valid: !!user });
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const slug = (await params).slug;
  const action = slug?.[0];
  let body: any = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {}

  await connectDB();

  try {
    // ──── POST /api/v1/passwords/forgot ────
    if (action === "forgot") {
      const rl = checkRateLimit(request, "passwords:forgot", 3, 60_000);
      if (!rl.allowed) return errorResponse(429, "rate_limit_exceeded", "Too many password reset requests. Try again later.");
      const val = validate(forgotPasswordSchema, body);
      if (val.error) return val.error;
      const { email } = val.data!;
      const user = await User.findOne({ email });
      if (!user) {
        return successResponse({ message: "If an account with that email exists, a reset link has been sent." });
      }
      const resetToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
      user.resetPasswordToken = hashedToken;
      user.resetPasswordTokenExpire = Date.now() + RESET_TOKEN_MINUTES * 60 * 1000;
      await user.save({ validateBeforeSave: false });
      const resetUrl = `${getOrigin(request)}/reset-password/${resetToken}`;
      // Email is fire-and-forget: never block the response on SMTP latency.
      // A delivery failure is logged by the service; the token stays valid so
      // the user can retry forgot-password.
      void sendResetPasswordEmail(user.email, resetUrl, RESET_TOKEN_MINUTES).catch((e) => {
        console.error("Reset password email failed to send:", e);
      });
      if (process.env.NODE_ENV !== "production") {
        console.log(`[dev] Password reset link for ${user.email}: ${resetUrl}`);
      }
      void trackServer({ userId: user._id.toString(), event: "password_reset_requested", request });
      return successResponse({ message: "If an account with that email exists, a reset link has been sent." });
    }

    // ──── POST /api/v1/passwords/reset ────
    if (action === "reset") {
      const rl = checkRateLimit(request, "passwords:reset", 5, 60_000);
      if (!rl.allowed) return errorResponse(429, "rate_limit_exceeded", "Too many password reset attempts. Try again later.");
      const token = body.token;
      if (!token) return errorResponse(400, "validation_error", "Token is required");
      const val = validate(resetPasswordSchema, body);
      if (val.error) return val.error;
      const { password } = val.data!;
      const hashedToken = hashToken(token);
      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordTokenExpire: { $gt: Date.now() },
      });
      if (!user) return errorResponse(400, "token_invalid", "Invalid or expired reset token");
      if (user.password && (await bcrypt.compare(password, user.password))) {
        return errorResponse(400, "same_password", "You are already using this password. Please choose a different password.");
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      // Atomic consume: the token dies on first successful use (one-time use),
      // even under concurrent submissions.
      const consumed = await User.updateOne(
        { _id: user._id, resetPasswordToken: hashedToken, resetPasswordTokenExpire: { $gt: Date.now() } },
        {
          $set: { password: hashedPassword, isVerified: true },
          $unset: { resetPasswordToken: "", resetPasswordTokenExpire: "" },
        }
      );
      if (consumed.modifiedCount === 0) return errorResponse(400, "token_invalid", "Invalid or expired reset token");
      // Password reset → revoke EVERY session (all devices). Old access and
      // refresh tokens die with the session status flip, so every device must
      // sign in again with the new password. `revoked` = security revocation.
      await LoginSession.updateMany({ userId: user._id, status: "active" }, { status: "revoked", isCurrent: false });
      invalidateSessionCache();
      void trackServer({ userId: user._id.toString(), event: "password_reset_completed", request });
      return successResponse({ message: "Password changed. Please log in with your new password." });
    }

    return errorResponse(404, "not_found", "Route not found");
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
