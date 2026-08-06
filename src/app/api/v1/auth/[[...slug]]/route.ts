import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import mongoose from "mongoose";
import User from "@/lib/server/models/User";
import LoginSession from "@/lib/server/models/LoginSession";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse, getOrigin } from "@/lib/server/utils/apiResponse";
import { buildTokenPayload } from "@/lib/server/utils/generateTokens";
import { cookieOptions, getRefreshCookieOptions } from "@/lib/server/utils/cookieOptions";
import { sendVerificationEmail } from "@/lib/server/services/emailService";
import { auth, invalidateSessionCache } from "@/lib/server/middleware/auth";
import { validate } from "@/lib/server/middleware/validate";
import { registerSchema, loginSchema, changePasswordSchema, chooseUsernameSchema, unlinkProviderSchema, manageEmailSchema } from "@/lib/server/validators/authValidator";
import { formatUser } from "@/lib/server/utils/formatUser";
import { authPayload, issueSession, getSessionRemember } from "@/lib/server/utils/authHelpers";
import { generatePublicId } from "@/lib/server/utils/publicId";
import { generateUniqueUsername } from "@/lib/server/utils/usernameGenerator";
import { trackServer } from "@/lib/server/utils/trackEvent";
import { z } from "zod";
import { checkRateLimit, getClientIp } from "@/lib/server/utils/http";
import { checkBruteForce, recordFailure, resetBruteForce } from "@/lib/server/utils/bruteForce";
import { getSessionTokenVersion } from "@/lib/server/utils/authHelpers";
import { auditLog } from "@/lib/server/utils/auditLog";

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
      const rl = checkRateLimit(request, "auth:register", 3, 60_000);
      if (!rl.allowed) return errorResponse(429, "rate_limit_exceeded", "Too many registration attempts. Try again later.");
      const val = validate(registerSchema, body);
      if (val.error) return val.error;
      const { name, password } = val.data!;
      const email = val.data!.email.toLowerCase().trim();
      const existingUser = await User.findOne({ $or: [{ email }, { pendingEmail: email }] });

      if (existingUser) {
        return errorResponse(409, "account_already_exists", "An account with this email already exists. Please log in instead.");
      }

      const isDev = process.env.NODE_ENV !== "production";
      const placeholderUsername = await generateUniqueUsername(name || email.split("@")[0] || "user");
      const hashedPassword = await bcrypt.hash(password, 10);
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const hashedVerificationToken = crypto.createHash("sha256").update(verificationToken).digest("hex");
      const user = await User.create({
        name, username: placeholderUsername, usernameSet: false, email, password: hashedPassword,
        role: "free", publicId: await generatePublicId(),
        linkedProviders: ["email"],
        isVerified: isDev,
        emailVerificationToken: hashedVerificationToken,
        emailVerificationTokenExpire: Date.now() + 24 * 60 * 60 * 1000,
      });
      const verifyUrl = `${getOrigin(request)}/api/v1/verification/email/verify/${verificationToken}`;
      // Email is fire-and-forget: never block registration on SMTP latency.
      // A failed send (e.g. dev SMTP absent) leaves the account usable (isVerified
      // is dev-true / prod-false; the user can still verify via resend).
      void sendVerificationEmail(user.email, verifyUrl).catch((e) => {
        console.error("Verification email failed to send:", e);
      });
      void trackServer({ userId: user._id.toString(), event: "signup_completed", properties: { method: "email" }, request });
      return successResponse({ message: "Registration successful. Please check your email to verify your account." }, 201);
    }

    // ──── POST /api/v1/auth/login ────
    if (action === "login") {
      const rl = checkRateLimit(request, "auth:login", 10, 60_000);
      if (!rl.allowed) return errorResponse(429, "rate_limit_exceeded", "Too many login attempts. Try again later.");
      const val = validate(loginSchema, body);
      if (val.error) return val.error;
      const { identifier, password } = val.data!;
      const rememberMe = body.rememberMe === true;
      const lookup = identifier.trim().toLowerCase();
      const bf = checkBruteForce(request, `login:${lookup}`);
      if (bf.blocked) return errorResponse(429, "account_locked", "Too many failed login attempts. Please wait before trying again.");
      const user = await User.findOne({ $or: [{ email: lookup }, { pendingEmail: lookup }, { username: lookup }] });
      if (!user) {
        recordFailure(request, `login:${lookup}`);
        auditLog({ eventType: "auth:login_failed", ip: getClientIp(request), metadata: { identifier: lookup } }).catch(() => {});
        return errorResponse(401, "invalid_credentials", "Invalid email or password");
      }
      if (!user.password) {
        recordFailure(request, `login:${lookup}`);
        auditLog({ eventType: "auth:login_failed", ip: getClientIp(request), metadata: { identifier: lookup } }).catch(() => {});
        return errorResponse(401, "invalid_credentials", "Invalid email or password");
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        recordFailure(request, `login:${lookup}`);
        auditLog({ eventType: "auth:login_failed", ip: getClientIp(request), metadata: { identifier: lookup } }).catch(() => {});
        return errorResponse(401, "invalid_credentials", "Invalid email or password");
      }
      resetBruteForce(request, `login:${lookup}`);
      user.lastLoginAt = new Date();
      if (!user.linkedProviders) user.linkedProviders = [];
      if (!user.linkedProviders.includes("email")) user.linkedProviders.push("email");
      await user.save({ validateBeforeSave: false });
      // NOTE: we no longer hard-block login for unverified emails in production.
      // Undelivered verification emails would otherwise permanently lock users
      // out ("can't log back in"). Instead we let them in and surface a
      // verification prompt client-side via `requiresVerification`.
      void trackServer({ userId: user._id.toString(), event: "login", properties: { method: "password" }, request });
      auditLog({ eventType: "auth:login", userId: user._id.toString(), ip: getClientIp(request), userAgent: request.headers.get("user-agent") || undefined }).catch(() => {});
      const { payload } = await issueSession(request, user, "email", rememberMe);
      const res = NextResponse.json(
        { success: true, payload, requiresVerification: !user.isVerified, timestamp: Date.now() },
        { status: 200 }
      );
      res.cookies.set("refreshToken", payload.token.refreshToken, getRefreshCookieOptions(rememberMe));
      return res;
    }

    // ──── POST /api/v1/auth/logout ────
    if (action === "logout") {
      const rl = checkRateLimit(request, "auth:logout", 30, 60_000);
      if (!rl.allowed) return errorResponse(429, "rate_limit_exceeded", "Too many requests.");
      const who = await auth(request);
      if (!("error" in who)) {
        void trackServer({ userId: who.user.id, event: "logout", request });
        auditLog({ eventType: "auth:logout", userId: who.user.id, sessionId: who.user.jti }).catch(() => {});
        if (who.user.jti) {
          await LoginSession.findByIdAndUpdate(who.user.jti, { status: "logged_out", isCurrent: false });
          invalidateSessionCache(who.user.jti);
        }
      }
      const res = NextResponse.json({ success: true, payload: { message: "Logged out successfully" }, timestamp: Date.now() }, { status: 200 });
      res.cookies.delete("refreshToken");
      return res;
    }

    // ──── POST /api/v1/auth/logout-all ────
    if (action === "logout-all") {
      const rl = checkRateLimit(request, "auth:logout-all", 10, 60_000);
      if (!rl.allowed) return errorResponse(429, "rate_limit_exceeded", "Too many requests.");
      const userResult = await auth(request);
      if ("error" in userResult) return userResult.error;
      await LoginSession.updateMany({ userId: userResult.user.id, status: "active" }, { status: "logged_out", isCurrent: false });
      invalidateSessionCache();
      const res = NextResponse.json({ success: true, payload: { message: "Logged out from all devices" }, timestamp: Date.now() }, { status: 200 });
      res.cookies.delete("refreshToken");
      return res;
    }

    // ──── POST /api/v1/auth/refresh ────
    if (action === "refresh") {
      const rl = checkRateLimit(request, "auth:refresh", 120, 60_000);
      if (!rl.allowed) return errorResponse(429, "rate_limit_exceeded", "Too many requests.");
      const refreshToken = request.cookies.get("refreshToken")?.value;
      if (!refreshToken) {
        return NextResponse.json(
          { success: false, version: "1.0.0", payload: { error: { code: "token_missing", message: "Refresh token not found" } }, serverTimestamp: new Date().toISOString() },
          { status: 200 }
        );
      }
      const jwt = await import("jsonwebtoken");
      const REFRESH_ALGOS = ["HS256" as const];
      try {
        const decoded = jwt.default.verify(refreshToken, process.env.JWT_REFRESH_SECRET!, { algorithms: REFRESH_ALGOS }) as any;
        const user = await User.findById(decoded.id);
        if (!user) {
          return NextResponse.json(
            { success: false, version: "1.0.0", payload: { error: { code: "user_not_found", message: "User not found" } }, serverTimestamp: new Date().toISOString() },
            { status: 200 }
          );
        }

        // ── Refresh token rotation (atomic) ──
        // Raw driver ops: the running server's cached Mongoose schema may
        // predate the `rotatedAt` field, so strict-mode casts would fail.
        let tokenVersion: number | undefined;
        let sessionRemember: boolean | undefined;
        if (decoded.jti) {
          const updated = await LoginSession.collection.findOneAndUpdate(
            { _id: new mongoose.Types.ObjectId(decoded.jti), tokenVersion: decoded.ver ?? 0 },
            { $inc: { tokenVersion: 1 }, $set: { rotatedAt: new Date() } },
            { returnDocument: "after", projection: { tokenVersion: 1, status: 1, userId: 1, rotatedAt: 1, remember: 1 } }
          );
          if (!updated) {
            // Version mismatch: either a genuine replay of a stale token, or
            // two refreshes racing (multi-tab / parallel client calls sharing
            // one cookie). Within a short window after the last rotation,
            // re-issue with the CURRENT version so the racer succeeds instead
            // of killing the session.
            const session = await LoginSession.collection.findOne(
              { _id: new mongoose.Types.ObjectId(decoded.jti) },
              { projection: { tokenVersion: 1, status: 1, userId: 1, rotatedAt: 1, remember: 1 } }
            );
            const sessionMissing =
              !session || session.status !== "active" || session.userId.toString() !== decoded.id;
            if (sessionMissing) {
              const errRes = errorResponse(401, "session_revoked", "Session has been revoked. Please sign in again.");
              errRes.cookies.delete("refreshToken");
              return errRes;
            }
            // The session is alive but this refresh token's version is stale:
            // a rotation race (multi-tab / parallel refreshes / keepalive
            // requests outliving a page refresh). Re-issue at the CURRENT
            // version so the late racer succeeds instead of killing the
            // session — and never delete the cookie, so one tab's late
            // refresh can't log out every other tab.
            tokenVersion = (session as any).tokenVersion ?? 0;
            sessionRemember = (session as any).remember as boolean | undefined;
            await LoginSession.collection.updateOne(
              { _id: (session as any)._id },
              { $set: { rotatedAt: new Date() } }
            );
          } else {
            tokenVersion = (updated as any).tokenVersion;
            sessionRemember = (updated as any).remember as boolean | undefined;
          }
        }

        const tokenPayload = buildTokenPayload(user, decoded.jti, tokenVersion);
        const res = NextResponse.json({ success: true, payload: { token: tokenPayload }, timestamp: Date.now() }, { status: 200 });
        res.cookies.set("refreshToken", tokenPayload.refreshToken, getRefreshCookieOptions(sessionRemember ?? true));
        return res;
      } catch {
        const errRes = NextResponse.json(
          { success: false, version: "1.0.0", payload: { error: { code: "token_invalid", message: "Invalid or expired refresh token" } }, serverTimestamp: new Date().toISOString() },
          { status: 200 }
        );
        errRes.cookies.delete("refreshToken");
        return errRes;
      }
    }

    // ──── POST /api/v1/auth/change-password ────
    if (action === "change-password") {
      const rl = checkRateLimit(request, "auth:change-password", 5, 60_000);
      if (!rl.allowed) return errorResponse(429, "rate_limit_exceeded", "Too many requests.");
      const userResult = await auth(request);
      if ("error" in userResult) return userResult.error;
      const jti = userResult.user.jti;
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
      // Any outstanding password-reset link must die when the password is
      // changed through another path — the link is only valid for the
      // password state it was issued against.
      user.resetPasswordToken = undefined;
      user.resetPasswordTokenExpire = undefined;
      await user.save();
      void trackServer({ userId: user._id.toString(), event: "password_changed", request });
      auditLog({ eventType: "auth:password_changed", userId: user._id.toString(), sessionId: jti, ip: getClientIp(request) }).catch(() => {});
      const tokenVersion = jti ? await getSessionTokenVersion(jti) : undefined;
      const remember = jti ? await getSessionRemember(jti) : true;
      const newTokens = buildTokenPayload(user, jti, tokenVersion);
      const res = NextResponse.json({ success: true, payload: { message: "Password changed successfully", token: newTokens }, timestamp: Date.now() }, { status: 200 });
      res.cookies.set("refreshToken", newTokens.refreshToken, getRefreshCookieOptions(remember));
      return res;
    }

    // ──── POST /api/v1/auth/set-username (one-time, for OAuth users) ────
    if (action === "set-username") {
      const rl = checkRateLimit(request, "auth:set-username", 10, 60_000);
      if (!rl.allowed) return errorResponse(429, "rate_limit_exceeded", "Too many requests.");
      const userResult = await auth(request);
      if ("error" in userResult) return userResult.error;
      const jti = userResult.user.jti;
      const val = validate(chooseUsernameSchema, body);
      if (val.error) return val.error;
      const { username } = val.data!;
      const user = await User.findById(userResult.user.id);
      if (!user) return errorResponse(404, "user_not_found", "User not found");
      if (user.usernameSet) return errorResponse(409, "username_already_set", "Username has already been set and cannot be changed");
      const existingUsername = await User.findOne({ username, _id: { $ne: user._id } });
      if (existingUsername) {
        const userEmail = user.email || user.pendingEmail;
        const emailsMatch = userEmail && existingUsername.email && userEmail === existingUsername.email;
        const isOAuthOrphan = !existingUsername.password && !existingUsername.linkedProviders?.includes("email");
        if (emailsMatch || isOAuthOrphan) {
          return errorResponse(409, "username_taken_conflict", "An account with this email and username already exists");
        }
        return errorResponse(409, "username_taken", "Username is already taken");
      }
      user.username = username;
      user.usernameSet = true;
      if (user.pendingEmail) {
        // Move email from the OAuth account to this new account
        await User.updateOne({ email: user.pendingEmail, _id: { $ne: user._id } }, { $set: { email: null } });
        user.email = user.pendingEmail;
        user.pendingEmail = undefined;
      }
      await user.save();
      void trackServer({ userId: user._id.toString(), event: "username_set", request });
      const tokenVersion = jti ? await getSessionTokenVersion(jti) : undefined;
      const payload = authPayload(user, jti, tokenVersion);
      const res = NextResponse.json({ success: true, payload, timestamp: Date.now() }, { status: 200 });
      res.cookies.set("refreshToken", payload.token.refreshToken, getRefreshCookieOptions(jti ? await getSessionRemember(jti) : true));
      return res;
    }

    // ──── POST /api/v1/auth/link-and-merge ────
    if (action === "link-and-merge") {
      const rl = checkRateLimit(request, "auth:link-and-merge", 5, 60_000);
      if (!rl.allowed) return errorResponse(429, "rate_limit_exceeded", "Too many requests.");
      const userResult = await auth(request);
      if ("error" in userResult) return userResult.error;
      const user = await User.findById(userResult.user.id);
      if (!user) return errorResponse(404, "user_not_found", "User not found");
      // Find the target: same email (or pendingEmail), or OAuth orphan with matching username
      let target: any = null;
      const userEmail = user.email || user.pendingEmail;
      if (userEmail) {
        target = await User.findOne({ email: userEmail, _id: { $ne: user._id } });
      }
      if (!target) {
        const val = validate(z.object({ username: z.string().min(1).max(20).optional() }), body);
        if (val.error) return val.error;
        const { username } = val.data!;
        if (username) {
          target = await User.findOne({
            username,
            _id: { $ne: user._id },
            password: null,
            linkedProviders: { $nin: ["email"] },
          });
        }
      }
      if (!target) return errorResponse(404, "target_not_found", "No matching account found to link");
      // Delete the new user FIRST so unique indexes (email, username) are freed
      // before we save the target with the new user's values.
      await User.deleteOne({ _id: user._id });
      if (user.pendingEmail) target.email = user.pendingEmail;
      else if (user.email) target.email = user.email;
      if (user.password) target.password = user.password;
      if (!target.linkedProviders) target.linkedProviders = [];
      if (!target.linkedProviders.includes("email")) target.linkedProviders.push("email");
      if (user.name && !target.name) target.name = user.name;
      if (user.isVerified) target.isVerified = true;
      await target.save({ validateBeforeSave: false });
      void trackServer({ userId: target._id.toString(), event: "accounts_merged", properties: { deletedUserId: user._id.toString() }, request });
      const { payload } = await issueSession(request, target);
      const res = NextResponse.json({ success: true, payload, merged: true, timestamp: Date.now() }, { status: 200 });
      res.cookies.set("refreshToken", payload.token.refreshToken, cookieOptions);
      return res;
    }

    // ──── POST /api/v1/auth/unlink-provider ────
    if (action === "unlink-provider") {
      const rl = checkRateLimit(request, "auth:unlink-provider", 10, 60_000);
      if (!rl.allowed) return errorResponse(429, "rate_limit_exceeded", "Too many requests.");
      const userResult = await auth(request);
      if ("error" in userResult) return userResult.error;
      const val = validate(unlinkProviderSchema, body);
      if (val.error) return val.error;
      const { provider } = val.data!;
      const user = await User.findById(userResult.user.id);
      if (!user) return errorResponse(404, "user_not_found", "User not found");
      if (!user.linkedProviders || !user.linkedProviders.includes(provider)) {
        return errorResponse(400, "not_linked", "This provider is not linked to your account");
      }
      if (user.linkedProviders.length < 2) {
        return errorResponse(400, "last_provider", "Cannot unlink your only sign-in method. Add another provider first.");
      }
      if (provider === "email") {
        if (!user.password) return errorResponse(400, "no_password", "No password set for this account");
        user.password = undefined;
      } else {
        if (user.firebaseProvider === provider) {
          user.firebaseUid = undefined;
          user.firebaseProvider = undefined;
        }
      }
      user.linkedProviders = user.linkedProviders.filter((p: string) => p !== provider);
      await user.save({ validateBeforeSave: false });
      void trackServer({ userId: user._id.toString(), event: "provider_unlinked", properties: { provider }, request });
      return successResponse({ user: formatUser(user), message: `${provider} has been unlinked from your account` });
    }

    // ──── POST /api/v1/auth/manage-email ────
    if (action === "manage-email") {
      const rl = checkRateLimit(request, "auth:manage-email", 5, 60_000);
      if (!rl.allowed) return errorResponse(429, "rate_limit_exceeded", "Too many requests.");
      const userResult = await auth(request);
      if ("error" in userResult) return userResult.error;
      const val = validate(manageEmailSchema, body);
      if (val.error) return val.error;
      const { email, password } = val.data!;
      const normalizedEmail = email.toLowerCase().trim();
      const user = await User.findById(userResult.user.id);
      if (!user) return errorResponse(404, "user_not_found", "User not found");
      if (user.email && user.email === normalizedEmail) {
        return errorResponse(400, "same_email", "This is already your current email");
      }
      // The new address must not belong to another account — neither as a live
      // email nor as a pending (unconfirmed) change on someone else.
      const existing = await User.findOne({
        $or: [{ email: normalizedEmail }, { pendingEmail: normalizedEmail }],
        _id: { $ne: user._id },
      });
      if (existing) return errorResponse(409, "email_taken", "This email is already used by another account");
      if (password) {
        user.password = await bcrypt.hash(password, 10);
        if (!user.linkedProviders.includes("email")) user.linkedProviders.push("email");
      }
      // New email is NOT applied immediately. Store it as pending and require
      // confirmation via a link sent to the NEW address; only after the user
      // clicks it does the email actually change.
      user.pendingEmail = normalizedEmail;
      const verificationToken = crypto.randomBytes(32).toString("hex");
      user.emailVerificationToken = crypto.createHash("sha256").update(verificationToken).digest("hex");
      user.emailVerificationTokenExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const confirmUrl = `${getOrigin(request)}/api/v1/verification/email/verify/${verificationToken}`;
      try {
        await sendVerificationEmail(normalizedEmail, confirmUrl);
      } catch (e) {
        console.error("Confirmation email failed to send:", e);
        if (process.env.NODE_ENV === "production") {
          return errorResponse(500, "email_failed", "Failed to send confirmation email. Try again later.");
        }
      }
      if (process.env.NODE_ENV !== "production") {
        console.log(`[dev] Email change confirmation for ${user.email} -> ${normalizedEmail}: ${confirmUrl}`);
      }
      await user.save({ validateBeforeSave: false });
      return successResponse({ user: formatUser(user), message: `Confirmation email sent to ${normalizedEmail}. Click the link in the email to finish the change.` });
    }

    // ──── POST /api/v1/auth/upgrade (guest → free) ────
    if (action === "upgrade") {
      const rl = checkRateLimit(request, "auth:upgrade", 5, 60_000);
      if (!rl.allowed) return errorResponse(429, "rate_limit_exceeded", "Too many requests.");
      const userResult = await auth(request);
      if ("error" in userResult) return userResult.error;
      const val = validate(z.object({ email: z.string().email().optional(), password: z.string().min(6).optional() }), body);
      if (val.error) return val.error;
      const { email, password } = val.data!;
      const user = await User.findById(userResult.user.id);
      if (!user) return errorResponse(404, "user_not_found", "User not found");
      if (user.role !== "guest") return errorResponse(400, "not_guest", "Only guest accounts can be upgraded");
      if (email) {
        const normalizedEmail = email.toLowerCase().trim();
        const existing = await User.findOne({ email: normalizedEmail });
        if (existing && String(existing._id) !== String(user._id)) {
          return errorResponse(409, "email_taken", "Email already in use");
        }
        user.email = normalizedEmail;
      }
      if (password) user.password = await bcrypt.hash(password, 10);
      user.role = "free";
      if (!user.publicId) user.publicId = await generatePublicId();
      if (!user.linkedProviders) user.linkedProviders = [];
      if (!user.linkedProviders.includes("email")) user.linkedProviders.push("email");
      await user.save();
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

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const slug = (await params).slug;
  const action = slug?.[0];

  await connectDB();

  try {
    // ──── GET /api/v1/auth/session-exists ────
    // Cheapest possible boot-time probe: does the authoritative refresh cookie
    // exist? Lets the client distinguish a live session from a stale access
    // token that survived a browser restart (e.g. "Remember me" unchecked →
    // session cookie died with the window while localStorage didn't). No DB,
    // no token rotation — presence nearly equals validity because both the
    // cookie and the refresh JWT expire after 7 days.
    if (action === "session-exists") {
      const rl = checkRateLimit(request, "auth:session-exists", 60, 60_000);
      if (!rl.allowed) return errorResponse(429, "rate_limit_exceeded", "Too many requests.");
      const refreshToken = request.cookies.get("refreshToken")?.value;
      return successResponse({ valid: !!refreshToken && refreshToken.trim().length > 0 });
    }

    // ──── GET /api/v1/auth/me ────
    if (action === "me") {
      const rl = checkRateLimit(request, "auth:me", 120, 60_000);
      if (!rl.allowed) return errorResponse(429, "rate_limit_exceeded", "Too many requests.");
      const userResult = await auth(request);
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
// Force trigger rebuild to clear dev server compile error cache
