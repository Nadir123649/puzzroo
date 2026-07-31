import User from "@/lib/server/models/User";
import { generateUniqueUsername } from "@/lib/server/utils/usernameGenerator";

/**
 * Finds (or creates) the guest User document backing a browser's
 * `x-guest-id`. Guests have no JWT, so the oauth route resolves the header to
 * a real User doc before handleOAuth can convert it in place (preserving the
 * account and all its history).
 *
 * Uses raw collection ops (not Mongoose queries) so this works regardless of
 * whether the running server's cached User schema includes the `guestId`
 * field yet. The unique index from the schema guards against concurrent
 * duplicate inserts.
 */
export async function getOrCreateGuestUser(guestId: string) {
  const existing = await User.collection.findOne({ guestId });
  if (existing) return existing;

  const username = await generateUniqueUsername("guest");
  try {
    await User.collection.updateOne(
      { guestId },
      {
        $setOnInsert: {
          guestId,
          username,
          usernameSet: false,
          role: "guest",
          linkedProviders: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
      { upsert: true }
    );
  } catch (err: any) {
    // Duplicate-key race: another request inserted the same guestId first.
    if (err?.code !== 11000) throw err;
  }

  return User.collection.findOne({ guestId });
}
