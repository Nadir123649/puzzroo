import { NextRequest } from "next/server";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { auth } from "@/lib/server/middleware/auth";
import { seedAll } from "@/lib/server/seed";

/**
 * POST /api/v1/admin/seed
 * Protected: requires an admin JWT AND the `x-seed-key` header to match
 * SEED_KEY. Idempotent; safe to run repeatedly.
 */
export async function POST(request: NextRequest) {
  const userResult = await auth(request);
  if ("error" in userResult) return userResult.error;
  if (userResult.user.role !== "admin") {
    return errorResponse(403, "forbidden", "Admin role required");
  }

  const seedKey = request.headers.get("x-seed-key");
  if (!process.env.SEED_KEY || seedKey !== process.env.SEED_KEY) {
    return errorResponse(401, "seed_key_missing", "Valid x-seed-key header required");
  }

  const dry = new URL(request.url).searchParams.get("dry") === "true";

  try {
    await connectDB();
    const results = await seedAll(dry);
    return successResponse({ dry, results });
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", error.message || "Seed failed");
  }
}
