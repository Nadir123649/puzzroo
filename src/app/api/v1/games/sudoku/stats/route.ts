import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { getUserStats } from "@/lib/server/services/sudoku/statisticsService";
import { auth } from "@/lib/server/middleware/auth";

export async function GET(request: NextRequest) {
  const userResult = await auth(request);
  if ("error" in userResult) return userResult.error;

  try {
    const stats = await getUserStats(userResult.user.id);
    if (!stats) return successResponse(null);

    return successResponse(stats);
  } catch (error: any) {
    console.error("[sudoku/stats]", error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
