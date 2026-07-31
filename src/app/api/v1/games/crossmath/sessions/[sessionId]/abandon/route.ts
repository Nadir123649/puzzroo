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

  let session
  try {
    session = await sessionService.abandonSession(sessionId, actor)
    if (actor.type === "user") {
      try {
        await statisticsService.updateOnSessionAbandon(actor.id, session.puzzleId, session.difficulty)
      } catch (error) {
        // statistics failure is non-fatal; session is already finalized
      }
    }
  } catch (error: any) {
    const code = error?.message || error?.code
    if (code !== "already_abandoned" && code !== "already_completed" && code !== "session_not_active") throw error
    session = await sessionService.getSession(sessionId, actor)
    if (session.sessionStatus !== "abandoned" && session.sessionStatus !== "completed") throw error
  }

  return successResponse({ sessionId: session.sessionId, sessionStatus: session.sessionStatus, abandonedAt: session.abandonedAt })
})
