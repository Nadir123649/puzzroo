import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { getUserDailyHistory } from "@/lib/server/services/sudoku/dailyChallengeService";
import { withAuth } from "../../route-helpers";

export const GET = withAuth(async (_request: NextRequest, actor, _params) => {
  try {
    if (actor.type === "guest") {
      return successResponse([]);
    }
    const history = await getUserDailyHistory(actor.id);
    return successResponse(history);
  } catch (error: any) {
    console.error("[sudoku/daily/history]", error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
});
