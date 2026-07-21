import { NextRequest } from "next/server";
import mongoose from "mongoose";
import User from "@/lib/server/models/User";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { auth } from "@/lib/server/middleware/auth";

// POST /api/v1/admin/promote  (admin only)
// Body: { identifier: string }  -> promote a user (matched by email / username /
// publicId / _id) to the `admin` role. Mirrors the matching logic in the
// analytics/user lookup so any identifier the tracking page accepts works here.
export async function POST(request: NextRequest) {
  const authResult = await auth(request);
  if ("error" in authResult) return authResult.error;
  if (authResult.user.role !== "admin") {
    return errorResponse(403, "forbidden", "Admin access required");
  }

  let body: any = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {}

  const identifier = (body.identifier || "").trim();
  if (!identifier) return errorResponse(400, "validation_error", "identifier is required");

  await connectDB();

  const digits = identifier.replace(/\D/g, "");
  const candidates = [identifier];
  if (digits.length === 10) {
    candidates.push(`${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6, 9)}-${digits.slice(9)}`);
  }
  const or: any[] = [
    { publicId: { $in: candidates } },
    { username: identifier.toLowerCase() },
    { email: identifier.toLowerCase() },
  ];
  if (mongoose.Types.ObjectId.isValid(identifier)) or.push({ _id: identifier });

  try {
    const user = await User.findOne({ $or: or });
    if (!user) return errorResponse(404, "user_not_found", "No user found for that identifier");

    const wasAdmin = user.role === "admin";
    user.role = "admin";
    await user.save({ validateBeforeSave: false });

    return successResponse({
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      alreadyAdmin: wasAdmin,
    });
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
