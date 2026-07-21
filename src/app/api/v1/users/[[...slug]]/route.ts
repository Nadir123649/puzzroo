import { NextRequest } from "next/server";
import User from "@/lib/server/models/User";
import LoginSession from "@/lib/server/models/LoginSession";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { formatUser } from "@/lib/server/utils/formatUser";
import { auth } from "@/lib/server/middleware/auth";
import { generatePublicId } from "@/lib/server/utils/publicId";
import { validate } from "@/lib/server/middleware/validate";
import { updateProfileSchema } from "@/lib/server/validators/authValidator";
import { trackServer } from "@/lib/server/utils/trackEvent";

async function getUserId(request: NextRequest) {
  const result = await auth(request);
  if ("error" in result) return { error: result.error };
  return { userId: result.user.id };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const slug = (await params).slug;
  const action = slug?.[0];

  await connectDB();

  const userResult = await getUserId(request);
  if ("error" in userResult) return userResult.error;

  try {
    // GET /api/v1/users/me
    if (!action || action === "me") {
      const user = await User.findById(userResult.userId);
      if (!user) return errorResponse(404, "user_not_found", "User not found");
      // Backfill a public account id for real accounts created before the field
      // existed, so the UI always has the friendly 10-digit id to show.
      if (user.role !== "guest" && !user.publicId) {
        user.publicId = await generatePublicId();
        await user.save({ validateBeforeSave: false });
      }
      return successResponse(formatUser(user));
    }

    return errorResponse(404, "not_found", "Route not found");
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  const slug = (await params).slug;
  const action = slug?.[0];

  await connectDB();

  const userResult = await getUserId(request);
  if ("error" in userResult) return userResult.error;

  try {
    // PATCH /api/v1/users/me
    if (!action || action === "me") {
      const body = await request.json();
      const val = validate(updateProfileSchema, body);
      if (val.error) return val.error;
      const updates: Record<string, any> = {};
      if (val.data!.name !== undefined) updates.name = val.data!.name;
      if (val.data!.phone !== undefined) updates.phone = val.data!.phone;
      const user = await User.findByIdAndUpdate(userResult.userId, updates, {
        new: true, runValidators: true,
      });
      if (!user) return errorResponse(404, "user_not_found", "User not found");
      await trackServer({ userId: userResult.userId, event: "profile_updated", properties: { fields: Object.keys(updates) }, request });
      return successResponse(formatUser(user));
    }

    return errorResponse(404, "not_found", "Route not found");
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ slug?: string[] }> }) {
  await connectDB();

  const userResult = await getUserId(request);
  if ("error" in userResult) return userResult.error;

  const slug = (await params).slug;
  const action = slug?.[0];

  try {
    // DELETE /api/v1/users/me — delete entire account
    if (!action || action === "me") {
      const user = await User.findById(userResult.userId);
      if (!user) return errorResponse(404, "user_not_found", "User not found");
      await trackServer({ userId: userResult.userId, event: "account_deleted", request });
      await LoginSession.deleteMany({ userId: userResult.userId });
      await user.deleteOne();
      const res = successResponse({ message: "Account deleted successfully" });
      res.cookies.delete("refreshToken");
      return res;
    }

    return errorResponse(404, "not_found", "Route not found");
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
