import { NextRequest } from "next/server";
import EmailPreference from "@/lib/server/models/EmailPreference";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { auth } from "@/lib/server/middleware/auth";
import { validate } from "@/lib/server/middleware/validate";
import { updateEmailPreferenceSchema } from "@/lib/server/validators/emailPreferenceValidator";

function getUserId(request: NextRequest) {
  const result = auth(request);
  if ("error" in result) return { error: result.error };
  return { userId: result.user.id };
}

export async function GET(request: NextRequest) {
  await connectDB();

  const userResult = getUserId(request);
  if ("error" in userResult) return userResult.error;

  try {
    let prefs = await EmailPreference.findOne({ userId: userResult.userId });
    if (!prefs) {
      prefs = await EmailPreference.create({ userId: userResult.userId });
    }
    return successResponse(prefs);
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}

export async function PATCH(request: NextRequest) {
  await connectDB();

  const userResult = getUserId(request);
  if ("error" in userResult) return userResult.error;

  try {
    const body = await request.json();
    const val = validate(updateEmailPreferenceSchema, body);
    if (val.error) return val.error;
    const allowed = ["updates", "dailyChallenge", "competition", "tips", "security"];
    const updates: Record<string, boolean> = {};
    for (const key of allowed) {
      const value = val.data![key as keyof typeof val.data];
      if (typeof value === "boolean") {
        updates[key] = value;
      }
    }
    if (Object.keys(updates).length === 0) {
      return errorResponse(400, "validation_error", "No valid preferences provided");
    }
    const prefs = await EmailPreference.findOneAndUpdate(
      { userId: userResult.userId },
      { $set: updates },
      { new: true, upsert: true, runValidators: true }
    );
    return successResponse(prefs);
  } catch (error: any) {
    console.error(error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
