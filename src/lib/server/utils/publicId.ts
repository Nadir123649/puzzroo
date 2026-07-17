import crypto from "crypto";
import User from "@/lib/server/models/User";

/**
 * Generates a unique public account id: 10 numeric digits formatted as
 * `xxx-xxx-xxx-x`. Retries until an unused id is found. Used when an account
 * becomes "real" (email signup, OAuth account creation, or guest conversion).
 */
export async function generatePublicId(): Promise<string> {
  for (let attempt = 0; attempt < 25; attempt++) {
    let digits = "";
    for (let i = 0; i < 10; i++) {
      digits += (crypto.randomInt(0, 10)).toString();
    }
    const formatted = `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}-${digits.slice(9)}`;
    const existing = await User.findOne({ publicId: formatted }).select("_id").lean();
    if (!existing) return formatted;
  }
  throw new Error("Failed to generate a unique publicId after multiple attempts");
}
