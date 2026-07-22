import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { getResumableSession } from "@/lib/server/services/sudoku/sessionService";
import { auth } from "@/lib/server/middleware/auth";

export async function GET(request: NextRequest) {
  const userResult = await auth(request);
  if ("error" in userResult) return userResult.error;

  try {
    const session = await getResumableSession(userResult.user.id);
    if (!session) return successResponse(null);

    return successResponse(session);
  } catch (error: any) {
    console.error("[sudoku/continue]", error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
