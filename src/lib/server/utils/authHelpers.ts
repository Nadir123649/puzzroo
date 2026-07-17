import User from "@/lib/server/models/User";
import { buildTokenPayload } from "@/lib/server/utils/generateTokens";
import { formatUser } from "@/lib/server/utils/formatUser";
import { getAuth } from "@/lib/server/config/firebase";
import { generateUniqueUsername } from "@/lib/server/utils/usernameGenerator";
import { generatePublicId } from "@/lib/server/utils/publicId";

export const isFirebaseReady = Boolean(
  process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
);

export function authPayload(user: any) {
  return {
    user: formatUser(user),
    token: buildTokenPayload(user),
    access: {
      additionalPermissions: [],
      roles: user.role === "admin" ? ["admin"] : [],
    },
  };
}

export async function handleOAuth(
  provider: string,
  firebaseToken: string,
  currentUserId?: string
): Promise<{ payload: any; refreshToken: string; converted: boolean } | undefined> {
  if (!isFirebaseReady) {
    return undefined;
  }
  const decoded = await getAuth().verifyIdToken(firebaseToken);
  const { uid, email, name, picture } = decoded;
  const firebaseProvider = decoded.firebase?.sign_in_provider;
  if (firebaseProvider !== provider) {
    return undefined;
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
        user.provider = mappedProvider;
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
      guest.provider = mappedProvider;
      if (normalizedEmail) guest.email = normalizedEmail;
      if (name) guest.name = name;
      if (picture) guest.avatar = picture;
      guest.role = "free";
      guest.isVerified = true;
      guest.usernameSet = false;
      guest.username = await generateUniqueUsername(name || normalizedEmail?.split("@")[0] || `user${uid.slice(-6)}`);
      if (!guest.publicId) guest.publicId = await generatePublicId();
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
      provider: mappedProvider, avatar: picture || null, role: "free", isVerified: true,
    });
  } else if (user.role !== "guest" && !user.publicId) {
    // Backfill a publicId for pre-existing real accounts that never had one.
    // publicId is ONLY ever set when missing — it is permanent and never changes.
    user.publicId = await generatePublicId();
  }
  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });
  return { payload: authPayload(user), refreshToken: buildTokenPayload(user).refreshToken, converted };
}
