import { NextRequest } from "next/server";
import { withAuth } from "../route-helpers";
import { statisticsService } from "@/lib/server/puzzles/nonogram/services/StatisticsService";
import { successResponse } from "@/lib/server/utils/apiResponse";

export const GET = withAuth(async (req, user) => {
  const stats = await statisticsService.getUserStats(user.id);
  return successResponse(stats);
});
