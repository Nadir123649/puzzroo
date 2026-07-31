import { withAuth } from "../../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/tangram/services/SessionService"
import { statisticsService } from "@/lib/server/puzzles/tangram/services/StatisticsService"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"

export const POST = withAuth(async (_req, user, params) => {
  const session = await sessionService.abandonSession(params.id, user.id)
  await statisticsService.updateOnSessionAbandon(user.id, session.puzzleId, session.difficulty)
  return successResponse(session)
})
