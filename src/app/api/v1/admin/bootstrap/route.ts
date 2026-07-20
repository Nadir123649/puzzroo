import { NextRequest } from "next/server";
import User from "@/lib/server/models/User";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";

// One-time bootstrap to grant admin when no admin can run a DB script.
// Guarded by ADMIN_SETUP_KEY (set in the hosting env). Call it twice, once
// per email. Safe to leave deployed — it refuses to do anything without the
// correct key, and only ever promotes (never demotes).
//
//   curl -X POST https://<site>/api/v1/admin/bootstrap \
//     -H "x-admin-setup-key: <ADMIN_SETUP_KEY>" \
//     -H "Content-Type: application/json" \
//     -d '{"email":"mhassan.irfan82@gmail.com"}'
export async function POST(request: NextRequest) {
  const setupKey = process.env.ADMIN_SETUP_KEY;
  if (!setupKey) {
    return errorResponse(403, "forbidden", "Admin bootstrap is not enabled");
  }

  const provided =
    request.headers.get("x-admin-setup-key") ||
    new URL(request.url).searchParams.get("key");
  if (provided !== setupKey) {
    return errorResponse(403, "forbidden", "Invalid setup key");
  }

  let body: any = {};
  try {
    const text = await request.text();
    if (text) body = JSON.parse(text);
  } catch {}

  const email = (body.email || "").toLowerCase().trim();
  if (!email) return errorResponse(400, "validation_error", "email is required");

  await connectDB();
  const user = await User.findOne({ email });
  if (!user) return errorResponse(404, "user_not_found", "No account exists with that email");

  const wasAdmin = user.role === "admin";
  user.role = "admin";
  await user.save({ validateBeforeSave: false });

  return successResponse({
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    alreadyAdmin: wasAdmin,
  });
}
