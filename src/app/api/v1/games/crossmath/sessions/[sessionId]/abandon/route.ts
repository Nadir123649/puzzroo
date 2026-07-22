import { NextRequest } from "next/server"
import { withAuth } from "../../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/crossmath/services/SessionService"
import { statisticsService } from "@/lib/server/puzzles/crossmath/services/StatisticsService"
import { successResponse } from "@/lib/server/utils/apiResponse"

export const POST = withAuth(async (req, user, params) => {
  const { sessionId } = params
  const session = await sessionService.abandonSession(sessionId, user.id)

  await statisticsService.updateOnSessionAbandon(user.id, session.puzzleId, session.difficulty)

  return successResponse({ sessionId: session.sessionId, status: session.status, abandonedAt: session.abandonedAt })
})
