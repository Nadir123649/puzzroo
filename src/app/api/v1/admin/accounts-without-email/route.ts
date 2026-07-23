import { NextRequest } from "next/server";
import User from "@/lib/server/models/User";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { auth } from "@/lib/server/middleware/auth";

export async function GET(request: NextRequest) {
  const authResult = await auth(request);
  if ("error" in authResult) return authResult.error;
  if (authResult.user.role !== "admin") {
    return errorResponse(403, "forbidden", "Admin access required");
  }

  await connectDB();

  const users = await User.find({ email: null, linkedProviders: { $exists: true, $not: { $size: 0 } } })
    .select("username name provider linkedProviders createdAt firebaseProvider firebaseUid")
    .sort({ createdAt: -1 })
    .lean();

  return successResponse(users.map(u => ({
    id: u._id.toString(),
    username: u.username,
    name: u.name,
    provider: u.provider,
    linkedProviders: u.linkedProviders,
    firebaseProvider: u.firebaseProvider,
    createdAt: u.createdAt,
  })));
}
