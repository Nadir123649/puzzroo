import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import User from "@/lib/server/models/User";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { sendResetPasswordEmail } from "@/lib/server/services/emailService";
import { validate } from "@/lib/server/middleware/validate";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/server/validators/authValidator";
import { trackServer } from "@/lib/server/utils/trackEvent";
import { authPayload, issueSession } from "@/lib/server/utils/authHelpers";
import { buildTokenPayload } from "@/lib/server/utils/generateTokens";
import { cookieOptions } from "@/lib/server/utils/cookieOptions";

// Reset links are short-lived for security.
const RESET_TOKEN_MINUTES = 15;

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
      const val = validate(forgotPasswordSchema, body);
      if (val.error) return val.error;
      const { email } = val.data!;
      const user = await User.findOne({ email });
      if (!user) return errorResponse(404, "email_not_found", "Invalid email");
      const resetToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto.createHash("sha256").update(resetToken).digest("hex");
      user.resetPasswordToken = hashedToken;
      user.resetPasswordTokenExpire = Date.now() + RESET_TOKEN_MINUTES * 60 * 1000;
      await user.save({ validateBeforeSave: false });
      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
      try {
        await sendResetPasswordEmail(user.email, resetUrl, RESET_TOKEN_MINUTES);
      } catch {
        // Don't revert the token on a transient email failure — let the user
        // retry forgot-password. In dev, SMTP may be unavailable; ignore it.
        if (process.env.NODE_ENV === "production") {
          return errorResponse(500, "email_failed", "Failed to send reset email. Try again later.");
        }
      }
      await trackServer({ userId: user._id.toString(), event: "password_reset_requested", request });
      return successResponse({ message: "If an account with that email exists, a reset link has been sent." });
    }

    // ──── POST /api/v1/passwords/reset ────
    if (action === "reset") {
      const token = body.token;
      if (!token) return errorResponse(400, "validation_error", "Token is required");
      const val = validate(resetPasswordSchema, body);
      if (val.error) return val.error;
      const { password } = val.data!;
      const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordTokenExpire: { $gt: Date.now() },
      });
      if (!user) return errorResponse(400, "token_invalid", "Invalid or expired reset token");
      user.password = await bcrypt.hash(password, 10);
      user.isVerified = true;
      user.resetPasswordToken = undefined;
      user.resetPasswordTokenExpire = undefined;
      user.lastLoginAt = new Date();
      await user.save({ validateBeforeSave: false });
      await trackServer({ userId: user._id.toString(), event: "password_reset_completed", request });
      const { payload } = await issueSession(request, user, "email");
      const res = NextResponse.json({ success: true, payload, timestamp: Date.now() }, { status: 200 });
      res.cookies.set("refreshToken", payload.token.refreshToken, cookieOptions);
      return res;
    }

    return errorResponse(404, "not_found", "Route not found");
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
