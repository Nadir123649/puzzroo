import { NextRequest, NextResponse, after } from "next/server";
import crypto from "crypto";
import User from "@/lib/server/models/User";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse, getOrigin } from "@/lib/server/utils/apiResponse";
import { cookieOptions } from "@/lib/server/utils/cookieOptions";
import { sendVerificationEmail, sendEmailChangedEmail } from "@/lib/server/services/emailService";
import { getFirebaseAuth } from "@/lib/server/config/firebase";
import { auth } from "@/lib/server/middleware/auth";
import { validate } from "@/lib/server/middleware/validate";
import { forgotPasswordSchema } from "@/lib/server/validators/authValidator";
import { formatUser } from "@/lib/server/utils/formatUser";
import { isFirebaseReady, issueSession } from "@/lib/server/utils/authHelpers";
import { generateUniqueUsername } from "@/lib/server/utils/usernameGenerator";
import { trackServer } from "@/lib/server/utils/trackEvent";
import { checkRateLimit } from "@/lib/server/utils/http";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
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
      const rl = checkRateLimit(request, "verification:email:verify", 10, 60_000);
      if (!rl.allowed) return errorResponse(429, "rate_limit_exceeded", "Too many requests. Try again later.");
      const token = body.token;
      if (!token) return errorResponse(400, "validation_error", "Token is required");
      const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
      const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationTokenExpire: { $gt: Date.now() },
      });
      if (!user) return errorResponse(400, "token_invalid", "Invalid or expired verification token");
      // If this token confirmed a pending email change, apply the swap now.
      if (user.pendingEmail) {
        const oldEmail = user.email;
        const conflict = await User.findOne({
          $or: [{ email: user.pendingEmail }, { pendingEmail: user.pendingEmail }],
          _id: { $ne: user._id },
        });
        if (conflict) return errorResponse(409, "email_taken", "This email is already used by another account");
        user.email = user.pendingEmail;
        user.pendingEmail = undefined;
        if (oldEmail) {
          // Fire-and-forget: never block the verification response on SMTP.
          // after() keeps the send alive past the response on serverless (Vercel).
          after(() =>
            sendEmailChangedEmail(oldEmail, user.name || user.username, user.email).catch((e) =>
              console.error("Email-changed notification failed to send:", e)
            )
          );
        }
      }
      user.isVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationTokenExpire = undefined;
      await user.save();
      return successResponse({ message: "Email verified successfully. You can now log in." });
    }

    // ──── POST /api/v1/verification/email/resend ────
    if (resource === "email" && action === "resend") {
      const rl = checkRateLimit(request, "verification:email:resend", 3, 900_000);
      if (!rl.allowed) return errorResponse(429, "rate_limit_exceeded", "Too many resend requests. Try again later.");
      const val = validate(forgotPasswordSchema, body);
      if (val.error) return val.error;
      const { email } = val.data!;
      const user = await User.findOne({ email });
      if (!user) {
        return successResponse({ message: "Verification email sent. Check your inbox." });
      }
      if (user.isVerified) return successResponse({ message: "Email is already verified." });
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = crypto.createHash("sha256").update(verificationToken).digest("hex");
      user.emailVerificationToken = hashedToken;
      user.emailVerificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000;
      await user.save({ validateBeforeSave: false });
      const verifyUrl = `${getOrigin(request)}/api/v1/verification/email/verify/${verificationToken}`;
      // Fire-and-forget: SMTP send takes seconds — never block the response.
      // after() keeps the send alive past the response on serverless (Vercel).
      // Failure is logged; the token stays valid so the user can retry resend.
      after(() =>
        sendVerificationEmail(user.email, verifyUrl).catch((e) => {
          console.error("Verification email failed to send:", e);
        })
      );
      return successResponse({ message: "Verification email sent. Check your inbox." });
    }

    // ──── POST /api/v1/verification/phone ────
    if (resource === "phone") {
      const rl = checkRateLimit(request, "verification:phone", 5, 60_000);
      if (!rl.allowed) return errorResponse(429, "rate_limit_exceeded", "Too many requests. Try again later.");
      if (!isFirebaseReady()) return errorResponse(500, "firebase_not_configured", "Firebase is not configured");
      const { firebaseToken } = body;
      if (!firebaseToken) return errorResponse(400, "validation_error", "Firebase token is required");
      const firebaseAuth = await getFirebaseAuth();
      const decoded = await firebaseAuth.verifyIdToken(firebaseToken);
      const phoneNumber = decoded.phone_number;
      if (!phoneNumber) return errorResponse(400, "no_phone", "No phone number in Firebase token");
      const userResult = await auth(request);
      if (!("error" in userResult)) {
        const existingUser = await User.findOne({ phone: phoneNumber, _id: { $ne: userResult.user.id } });
        if (existingUser) return errorResponse(409, "phone_taken", "Phone number already linked to another account");
        const user = await User.findByIdAndUpdate(userResult.user.id, { phone: phoneNumber }, { returnDocument: 'after' }).select("-password");
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
      const { payload } = await issueSession(request, user, "phone");
      void trackServer({ userId: user._id.toString(), event: "login", properties: { method: "phone" }, request });
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
  const slug = (await params).slug || [];
  const resource = slug[0]; // "email"
  const action = slug[1]; // "verify"
  const token = slug[2];

  await connectDB();

  try {
    // ──── GET /api/v1/verification/email/verify/:token (email link) ────
    if (resource === "email" && action === "verify") {
      const baseUrl = getOrigin(request);
      if (!token) return NextResponse.redirect(new URL("/login?verified=false", baseUrl));
      const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
      const user = await User.findOne({
        emailVerificationToken: hashedToken,
        emailVerificationTokenExpire: { $gt: Date.now() },
      });
      if (!user) return NextResponse.redirect(new URL("/login?verified=false", baseUrl));
      // If this token confirmed a pending email change, apply the swap now.
      if (user.pendingEmail) {
        const oldEmail = user.email;
        const conflict = await User.findOne({
          $or: [{ email: user.pendingEmail }, { pendingEmail: user.pendingEmail }],
          _id: { $ne: user._id },
        });
        if (conflict) return NextResponse.redirect(new URL("/login?verified=false", baseUrl));
        user.email = user.pendingEmail;
        user.pendingEmail = undefined;
        if (oldEmail) {
          // Fire-and-forget: never block the email-verify redirect on SMTP.
          // after() keeps the send alive past the response on serverless (Vercel).
          after(() =>
            sendEmailChangedEmail(oldEmail, user.name || user.username, user.email).catch((e) =>
              console.error("Email-changed notification failed to send:", e)
            )
          );
        }
      }
      user.isVerified = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationTokenExpire = undefined;
      // If a pending password hash exists (linking flow), apply it and link "email" provider
      if (user.pendingPasswordHash) {
        user.password = user.pendingPasswordHash;
        user.pendingPasswordHash = undefined;
        if (!user.linkedProviders.includes("email")) user.linkedProviders.push("email");
      }
      user.lastLoginAt = new Date();
      await user.save();
      const { payload } = await issueSession(request, user);
      void trackServer({ userId: user._id.toString(), event: "email_verified", request });
      void trackServer({ userId: user._id.toString(), event: "login", properties: { method: "email_verify_autologin" }, request });
      const res = NextResponse.redirect(new URL("/auth/complete", baseUrl));
      res.cookies.set("refreshToken", payload.token.refreshToken, cookieOptions);
      return res;
    }

    // ──── GET /api/v1/verification/merge/confirm/:token (email link) ────
    if (resource === "merge" && action === "confirm") {
      const baseUrl = getOrigin(request);
      if (!token) return NextResponse.redirect(new URL("/login?merge=false", baseUrl));
      const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
      const target = await User.findOne({
        mergeRequestTokenHash: hashedToken,
        mergeRequestTokenExpire: { $gt: Date.now() },
      });
      const failRedirect = async (t: any) => {
        t.mergeRequestTokenHash = undefined;
        t.mergeRequestTokenExpire = undefined;
        t.mergeRequestFromId = undefined;
        t.mergeRequestDonorEmail = undefined;
        await t.save({ validateBeforeSave: false }).catch(() => {});
        return NextResponse.redirect(new URL("/login?merge=false", baseUrl));
      };
      if (!target) return NextResponse.redirect(new URL("/login?merge=false", baseUrl));
      const donor = target.mergeRequestFromId ? await User.findById(target.mergeRequestFromId) : null;
      if (!donor) return failRedirect(target);
      const donorEmail = donor.email || donor.pendingEmail;
      if (donorEmail) {
        const conflict = await User.findOne({
          $or: [{ email: donorEmail }, { pendingEmail: donorEmail }],
          _id: { $ne: target._id },
        });
        if (conflict && String(conflict._id) !== String(donor._id)) return failRedirect(target);
      }
      // Delete the donor account FIRST so its unique email/username are freed
      // before we save the target with the donor's values.
      await User.deleteOne({ _id: donor._id });
      if (donor.pendingEmail) target.email = donor.pendingEmail;
      else if (donor.email) target.email = donor.email;
      if (donor.password) target.password = donor.password;
      if (donor.isVerified) target.isVerified = true;
      if (donor.name && !target.name) target.name = donor.name;
      if (!target.linkedProviders) target.linkedProviders = [];
      if (!target.linkedProviders.includes("email")) target.linkedProviders.push("email");
      target.mergeRequestTokenHash = undefined;
      target.mergeRequestTokenExpire = undefined;
      target.mergeRequestFromId = undefined;
      target.mergeRequestDonorEmail = undefined;
      target.lastLoginAt = new Date();
      await target.save({ validateBeforeSave: false });
      void trackServer({ userId: target._id.toString(), event: "accounts_merged", properties: { deletedUserId: donor._id.toString(), method: "email_confirmation" }, request });
      const { payload } = await issueSession(request, target);
      const res = NextResponse.redirect(new URL("/auth/complete", baseUrl));
      res.cookies.set("refreshToken", payload.token.refreshToken, cookieOptions);
      return res;
    }

    return errorResponse(404, "not_found", "Route not found");
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
