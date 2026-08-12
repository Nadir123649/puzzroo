import User from "@/lib/server/models/User";
import { isValidObjectId } from "mongoose";
import { buildTokenPayload } from "@/lib/server/utils/generateTokens";
import { formatUser } from "@/lib/server/utils/formatUser";
import { getFirebaseAuth } from "@/lib/server/config/firebase";
import { generateUniqueUsername } from "@/lib/server/utils/usernameGenerator";
import { generatePublicId } from "@/lib/server/utils/publicId";
import { createSession } from "@/lib/server/utils/createSession";

export function isFirebaseReady(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
  );
}

// Safely append a provider to a user's linkedProviders array, tolerating the
// field being undefined on documents created before it existed.
function addLinkedProvider(user: any, provider: string) {
  if (!user.linkedProviders) user.linkedProviders = [];
  if (!user.linkedProviders.includes(provider)) user.linkedProviders.push(provider);
}

// Builds the auth payload returned to the client. When `sessionId` is provided
// the issued tokens are bound to that login session (via the JWT `jti` claim),
// so deleting the session invalidates the tokens — making logout real.
export function authPayload(user: any, sessionId?: string, tokenVersion?: number) {
  return {
    user: formatUser(user),
    token: buildTokenPayload(user, sessionId, tokenVersion),
    access: {
      additionalPermissions: [],
      roles: user.role === "admin" ? ["admin"] : [],
    },
    ...(sessionId ? { sessionId } : {}),
  };
}

// Creates a fresh login session for `user` and returns a payload whose tokens
// are bound to that session. Use this for every "log the user in" flow so the
// issued access/refresh tokens carry a `jti` that maps back to a LoginSession.
export async function issueSession(request: any, user: any, provider?: string, remember = true) {
  const session = await createSession(request, user._id.toString(), provider, true, remember);
  const sessionId = session._id.toString();
  const tokenVersion = (session as any).tokenVersion ?? 0;
  return { sessionId, payload: authPayload(user, sessionId, tokenVersion) };
}

/** Read the current tokenVersion from a LoginSession. */
export async function getSessionTokenVersion(sessionId: string): Promise<number> {
  const { default: LoginSession } = await import("@/lib/server/models/LoginSession");
  const session = await LoginSession.findById(sessionId).select("tokenVersion").lean();
  return (session as any)?.tokenVersion ?? 0;
}

/** Read the current remember flag from a LoginSession (default true). */
export async function getSessionRemember(sessionId?: string): Promise<boolean> {
  if (!sessionId || !isValidObjectId(sessionId)) return true;
  const { default: LoginSession } = await import("@/lib/server/models/LoginSession");
  const session = await LoginSession.findById(sessionId).select("remember").lean();
  return (session as any)?.remember ?? true;
}

export async function handleOAuth(
  provider: string,
  firebaseToken: string,
  currentUserId?: string,
  request?: any,
  remember = true
): Promise<{ payload: any; refreshToken: string; converted: boolean; sessionId?: string } | undefined> {
  if (!isFirebaseReady()) {
    return undefined;
  }
  const firebaseAuth = await getFirebaseAuth();
  const decoded = await firebaseAuth.verifyIdToken(firebaseToken);
  const { uid, email, name, picture } = decoded;
  const firebaseProvider = decoded.firebase?.sign_in_provider;
  if (firebaseProvider !== provider) {
    throw Object.assign(
      new Error(`Provider mismatch: token signed with ${firebaseProvider}, requested ${provider}`),
      { code: "provider_mismatch" }
    );
  }
  // Normalize email so it always matches the lowercase-stored value. Without
  // this a differently-cased email from the provider would fail to match an
  // existing account and wrongly create a DUPLICATE with a brand-new publicId.
  const normalizedEmail = email ? email.toLowerCase().trim() : null;
  const providerMap: Record<string, string> = { "google.com": "google", "facebook.com": "facebook" };
  const mappedProvider = providerMap[firebaseProvider] || provider;
  let converted = false;
  let user = await User.findOne({ firebaseUid: uid });
  if (!user) {
    // Same email already registered (e.g. signed up with email/password first):
    // link this provider to that SAME account so it stays one account with its
    // original, permanent publicId.
    if (normalizedEmail) {
      user = await User.findOne({ email: normalizedEmail });
      if (user) {
        user.firebaseUid = uid;
        user.firebaseProvider = mappedProvider;
        user.provider = mappedProvider;
        addLinkedProvider(user, mappedProvider);
        if (user.password) addLinkedProvider(user, "email");
        if (picture && !user.avatar) user.avatar = picture;
        if (name && !user.name) user.name = name;
      }
    }
  }
  if (!user && currentUserId) {
    // The caller is currently signed in as a guest and is now authenticating
    // with an OAuth provider that has no existing account. Convert the guest
    // account IN PLACE (same _id) so all of its history — game progress,
    // analytics events, sessions — is preserved. The user keeps picking a real
    // username afterwards (usernameSet=false routes them to /choose-username).
    const guest = await User.findById(currentUserId);
    if (guest && guest.role === "guest") {
      guest.firebaseUid = uid;
      guest.firebaseProvider = mappedProvider;
      guest.provider = mappedProvider;
      if (normalizedEmail) guest.email = normalizedEmail;
      if (mappedProvider === "google" && normalizedEmail) guest.googleEmail = normalizedEmail;
      if (name) guest.name = name;
      if (picture) guest.avatar = picture;
      guest.role = "free";
      guest.isVerified = true;
      guest.usernameSet = false;
      guest.username = await generateUniqueUsername(name || normalizedEmail?.split("@")[0] || `user${uid.slice(-6)}`);
      if (!guest.publicId) guest.publicId = await generatePublicId();
      addLinkedProvider(guest, mappedProvider);
      user = guest;
      converted = true;
    }
  }
  if (!user) {
    // Brand-new OAuth user: create with a placeholder username and flag
    // usernameSet=false so the client sends them to the choose-username screen.
    const username = await generateUniqueUsername(name || normalizedEmail?.split("@")[0] || `user${uid.slice(-6)}`);
    user = await User.create({
      username, usernameSet: false, name: name || null,
      email: normalizedEmail || null, firebaseUid: uid, publicId: await generatePublicId(),
      provider: mappedProvider, firebaseProvider: mappedProvider, avatar: picture || null,
      role: "free", isVerified: true, linkedProviders: [mappedProvider],
      ...(mappedProvider === "google" && normalizedEmail ? { googleEmail: normalizedEmail } : {}),
    });
  } else if (user.role !== "guest" && !user.publicId) {
    // Backfill a publicId for pre-existing real accounts that never had one.
    // publicId is ONLY ever set when missing — it is permanent and never changes.
    user.publicId = await generatePublicId();
  }
  // Always make sure the provider used for THIS login is recorded as linked.
  // This covers the firebaseUid fast-path above, which skips the email-merge
  // block, so subsequent Google/Facebook logins aren't silently dropped from
  // the linked-providers list. Email is linked whenever a password exists.
  addLinkedProvider(user, mappedProvider);
  if (user.password) addLinkedProvider(user, "email");
  // Persist the provider's own email so the UI can always show the correct
  // Google account email, independent of the account email (which the user
  // can change later). Only set, never overwritten once present.
  if (mappedProvider === "google" && normalizedEmail) {
    user.googleEmail = normalizedEmail;
  }
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });
  let sessionId: string | undefined;
  let tokenVersion: number | undefined;
  if (request) {
    const session = await createSession(request, user._id.toString(), mappedProvider, true, remember);
    sessionId = session._id.toString();
    tokenVersion = (session as any).tokenVersion ?? 0;
  }
  return {
    payload: authPayload(user, sessionId, tokenVersion),
    refreshToken: buildTokenPayload(user, sessionId, tokenVersion).refreshToken,
    converted,
    sessionId
  };
}
