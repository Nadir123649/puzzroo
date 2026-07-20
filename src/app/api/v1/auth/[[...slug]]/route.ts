import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "@/lib/server/models/User";
import LoginSession from "@/lib/server/models/LoginSession";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { buildTokenPayload } from "@/lib/server/utils/generateTokens";
import { cookieOptions } from "@/lib/server/utils/cookieOptions";
import { sendVerificationEmail } from "@/lib/server/services/emailService";
import { auth } from "@/lib/server/middleware/auth";
import { validate } from "@/lib/server/middleware/validate";
import { registerSchema, loginSchema, changePasswordSchema, chooseUsernameSchema } from "@/lib/server/validators/authValidator";
import { formatUser } from "@/lib/server/utils/formatUser";
import { createSession } from "@/lib/server/utils/createSession";
import { authPayload } from "@/lib/server/utils/authHelpers";
import { generatePublicId } from "@/lib/server/utils/publicId";
import { trackServer } from "@/lib/server/utils/trackEvent";

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
    // ──── POST /api/v1/auth/register ────
    if (action === "register") {
      const val = validate(registerSchema, body);
      if (val.error) return val.error;
      const { name, username, password } = val.data!;
      const email = val.data!.email.toLowerCase().trim();
      const existingUser = await User.findOne({ email });
      if (existingUser) return errorResponse(409, "email_taken", "A user with this email already exists");
      const existingUsername = await User.findOne({ username });
      if (existingUsername) return errorResponse(409, "username_taken", "Username is already taken");
      const hashedPassword = await bcrypt.hash(password, 10);
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const hashedVerificationToken = crypto.createHash("sha256").update(verificationToken).digest("hex");
      const isDev = process.env.NODE_ENV !== "production";
      const user = await User.create({
        name, username, usernameSet: true, email, password: hashedPassword,
        role: "free", publicId: await generatePublicId(),
        linkedProviders: ["email"],
        isVerified: isDev,
        ...(isDev
          ? {}
          : {
              emailVerificationToken: hashedVerificationToken,
              emailVerificationTokenExpire: Date.now() + 24 * 60 * 60 * 1000,
            }),
      });
      const verifyUrl = `${process.env.FRONTEND_URL}/api/v1/verification/email/verify/${verificationToken}`;
      try { if (!isDev) await sendVerificationEmail(user.email, verifyUrl); } catch {}
      await trackServer({ userId: user._id.toString(), event: "signup_completed", properties: { method: "email" }, request });
      return successResponse({ message: "Registration successful. Please check your email to verify your account." }, 201);
    }

    // ──── POST /api/v1/auth/login ────
    if (action === "login") {
      const val = validate(loginSchema, body);
      if (val.error) return val.error;
      const { identifier, password } = val.data!;
      const rememberMe = body.rememberMe === true;
      const lookup = identifier.trim().toLowerCase();
      const user = await User.findOne({ $or: [{ email: lookup }, { username: lookup }] });
      const looksLikeEmail = lookup.includes("@");
      if (!user) return errorResponse(401, looksLikeEmail ? "invalid_email" : "invalid_credentials", looksLikeEmail ? "Invalid email" : "Invalid email or password");
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return errorResponse(401, "invalid_credentials", "Invalid email or password");
      if (user.password && !user.isVerified && process.env.NODE_ENV === "production") return errorResponse(403, "email_not_verified", "Please verify your email before logging in.");
      user.lastLoginAt = new Date();
      if (!user.linkedProviders) user.linkedProviders = [];
      if (!user.linkedProviders.includes("email")) user.linkedProviders.push("email");
      await user.save({ validateBeforeSave: false });
      const session = await createSession(request, user._id.toString(), "email");
      await trackServer({ userId: user._id.toString(), event: "login", properties: { method: "password" }, request });
      const res = NextResponse.json({ success: true, payload: { ...authPayload(user), sessionId: session._id.toString() }, timestamp: Date.now() }, { status: 200 });
      const loginCookieOptions = {
        ...cookieOptions,
        maxAge: rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60,
      };
      res.cookies.set("refreshToken", buildTokenPayload(user).refreshToken, loginCookieOptions);
      return res;
    }

    // ──── POST /api/v1/auth/logout ────
    if (action === "logout") {
      const who = auth(request);
      if (!("error" in who)) {
        await trackServer({ userId: who.user.id, event: "logout", request });
      }
      const res = NextResponse.json({ success: true, payload: { message: "Logged out successfully" }, timestamp: Date.now() }, { status: 200 });
      res.cookies.delete("refreshToken");
      return res;
    }

    // ──── POST /api/v1/auth/logout-all ────
    if (action === "logout-all") {
      const userResult = auth(request);
      if ("error" in userResult) return userResult.error;
      await LoginSession.deleteMany({ userId: userResult.user.id });
      const res = NextResponse.json({ success: true, payload: { message: "Logged out from all devices" }, timestamp: Date.now() }, { status: 200 });
      res.cookies.delete("refreshToken");
      return res;
    }

    // ──── POST /api/v1/auth/refresh ────
    if (action === "refresh") {
      const refreshToken = request.cookies.get("refreshToken")?.value;
      if (!refreshToken) return errorResponse(401, "token_missing", "Refresh token not found");
      const jwt = await import("jsonwebtoken");
      try {
        const decoded = jwt.default.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { id: string };
        const user = await User.findById(decoded.id);
        if (!user) return errorResponse(401, "user_not_found", "User not found");
        const tokenPayload = buildTokenPayload(user);
        const res = NextResponse.json({ success: true, payload: { token: tokenPayload }, timestamp: Date.now() }, { status: 200 });
        res.cookies.set("refreshToken", tokenPayload.refreshToken, cookieOptions);
        return res;
      } catch {
        return errorResponse(401, "token_invalid", "Invalid or expired refresh token");
      }
    }

    // ──── POST /api/v1/auth/change-password ────
    if (action === "change-password") {
      const userResult = auth(request);
      if ("error" in userResult) return userResult.error;
      const val = validate(changePasswordSchema, body);
      if (val.error) return val.error;
      const { currentPassword, newPassword } = val.data!;
      const user = await User.findById(userResult.user.id);
      if (!user) return errorResponse(404, "user_not_found", "User not found");
      if (!user.password) return errorResponse(400, "no_password", "No password set. Use OAuth or forgot password instead.");
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) return errorResponse(401, "invalid_credentials", "Current password is incorrect");
      const isSamePassword = await bcrypt.compare(newPassword, user.password);
      if (isSamePassword) return errorResponse(400, "same_password", "You are already using this password. Please choose a different password.");
      user.password = await bcrypt.hash(newPassword, 10);
      await user.save();
      await trackServer({ userId: user._id.toString(), event: "password_changed", request });
      const res = NextResponse.json({ success: true, payload: { message: "Password changed successfully", token: buildTokenPayload(user) }, timestamp: Date.now() }, { status: 200 });
      res.cookies.set("refreshToken", buildTokenPayload(user).refreshToken, cookieOptions);
      return res;
    }

    // ──── POST /api/v1/auth/set-username (one-time, for OAuth users) ────
    if (action === "set-username") {
      const userResult = auth(request);
      if ("error" in userResult) return userResult.error;
      const val = validate(chooseUsernameSchema, body);
      if (val.error) return val.error;
      const { username } = val.data!;
      const user = await User.findById(userResult.user.id);
      if (!user) return errorResponse(404, "user_not_found", "User not found");
      if (user.usernameSet) return errorResponse(409, "username_already_set", "Username has already been set and cannot be changed");
      const existingUsername = await User.findOne({ username, _id: { $ne: user._id } });
      if (existingUsername) return errorResponse(409, "username_taken", "Username is already taken");
      user.username = username;
      user.usernameSet = true;
      await user.save();
      await trackServer({ userId: user._id.toString(), event: "username_set", request });
      const res = NextResponse.json({ success: true, payload: authPayload(user), timestamp: Date.now() }, { status: 200 });
      res.cookies.set("refreshToken", buildTokenPayload(user).refreshToken, cookieOptions);
      return res;
    }

    // ──── POST /api/v1/auth/upgrade (guest → free) ────
    if (action === "upgrade") {
      const userResult = auth(request);
      if ("error" in userResult) return userResult.error;
      const { email, password } = body;
      const user = await User.findById(userResult.user.id);
      if (!user) return errorResponse(404, "user_not_found", "User not found");
      if (user.role !== "guest") return errorResponse(400, "not_guest", "Only guest accounts can be upgraded");
      if (email) {
        const existing = await User.findOne({ email });
        if (existing && String(existing._id) !== String(user._id)) {
          return errorResponse(409, "email_taken", "Email already in use");
        }
        user.email = email;
      }
      if (password) user.password = await bcrypt.hash(password, 10);
      user.role = "free";
      if (!user.publicId) user.publicId = await generatePublicId();
      if (!user.linkedProviders) user.linkedProviders = [];
      if (!user.linkedProviders.includes("email")) user.linkedProviders.push("email");
      await user.save();
      await createSession(request, user._id.toString(), "email");
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

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const slug = (await params).slug;
  const action = slug?.[0];

  await connectDB();

  try {
    // ──── GET /api/v1/auth/me ────
    if (action === "me") {
      const userResult = auth(request);
      if ("error" in userResult) return userResult.error;
      const user = await User.findById(userResult.user.id).select("-password");
      if (!user) return errorResponse(404, "user_not_found", "User not found");
      return successResponse({ user: formatUser(user) });
    }

    return errorResponse(404, "not_found", "Route not found");
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
