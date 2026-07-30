import { NextRequest } from "next/server"
import { withAuth } from "../../../route-helpers"
import type { Actor } from "../../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/crossmath/services/SessionService"
import { statisticsService } from "@/lib/server/puzzles/crossmath/services/StatisticsService"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { rateLimit } from "@/lib/server/utils/http"

export const POST = withAuth(async (req: NextRequest, actor: Actor, params) => {
  if (!rateLimit(req, "crossmath-abandon", 30)) {
    return errorResponse(429, "rate_limited", "Too many requests")
  }
  const { sessionId } = params
  const session = await sessionService.abandonSession(sessionId, actor)

  if (actor.type === "user") {
    await statisticsService.updateOnSessionAbandon(actor.id, session.puzzleId, session.difficulty)
  }

  return successResponse({ sessionId: session.sessionId, sessionStatus: session.sessionStatus, abandonedAt: session.abandonedAt })
})
