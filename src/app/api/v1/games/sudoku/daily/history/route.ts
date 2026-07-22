import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { getUserDailyHistory } from "@/lib/server/services/sudoku/dailyChallengeService";
import { auth } from "@/lib/server/middleware/auth";

export async function GET(request: NextRequest) {
  const userResult = await auth(request);
  if ("error" in userResult) return userResult.error;

  try {
    const history = await getUserDailyHistory(userResult.user.id);
    return successResponse(history);
  } catch (error: any) {
    console.error("[sudoku/daily/history]", error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
