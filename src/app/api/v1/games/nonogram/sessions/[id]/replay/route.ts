import { withAuth } from "../../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/nonogram/services/SessionService"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { rateLimit } from "@/lib/server/utils/http"

export const POST = withAuth(async (req, user, params) => {
  if (!rateLimit(req, "nonogram-replay", 15)) {
    return errorResponse(429, "rate_limited", "Too many requests")
  }

  const session = await sessionService.getSession(params.id, user.id)
  const newSession = await sessionService.replaySession(user.id, session.puzzleId)
  return successResponse(newSession, 201)
})
