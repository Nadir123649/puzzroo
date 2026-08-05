import { withAuth } from "../route-helpers"
import type { Actor } from "../route-helpers"
import { statisticsService } from "@/lib/server/puzzles/nonogram/services/StatisticsService"
import { successResponse } from "@/lib/server/utils/apiResponse"

export const GET = withAuth(async (_req, actor: Actor) => {
  if (actor.type === "guest") {
    return successResponse(null)
  }
  const stats = await statisticsService.getUserStats(actor.id)
  return successResponse(stats)
})
