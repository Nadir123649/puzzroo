import User from "@/lib/server/models/User";

/**
 * Sanitizes a base string into a valid username fragment:
 * lowercase, only [a-z0-9._-], and at least 3 chars.
 */
function sanitizeBase(base: string): string {
  let clean = (base || "")
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/^[._-]+/, ""); // avoid leading separators
  if (clean.length < 3) {
    clean = `user${clean}`;
  }
  return clean.slice(0, 20);
}

/**
 * Generates a unique username derived from `base`, appending a numeric
 * suffix until an unused one is found. Used for auto-created accounts
 * (OAuth placeholders, phone, guest).
 */
export async function generateUniqueUsername(base: string): Promise<string> {
  const root = sanitizeBase(base);
  let username = root;
  let counter = 1;
  // Cap suffix length so total stays within 20 chars.
  while (await User.findOne({ username })) {
    const suffix = String(counter);
    username = `${root.slice(0, 20 - suffix.length)}${suffix}`;
    counter++;
  }
  return username;
}
