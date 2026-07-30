import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { getUserStats } from "@/lib/server/services/sudoku/statisticsService";
import { withAuth } from "../route-helpers";

export const GET = withAuth(async (_request: NextRequest, actor, _params) => {
  try {
    if (actor.type === "guest") {
      return successResponse(null);
    }
    const stats = await getUserStats(actor.id);
    return successResponse(stats);
  } catch (error: any) {
    console.error("[sudoku/stats]", error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
});
