import { NextRequest } from "next/server"
import { withAuth } from "../../route-helpers"
import type { Actor } from "../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/tangram/services/SessionService"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { rateLimit } from "@/lib/server/utils/http"

export const GET = withAuth(async (req: NextRequest, actor: Actor) => {
  if (!rateLimit(req, "tangram-daily-continue", 30)) {
    return errorResponse(429, "rate_limited", "Too many requests")
  }

  const url = new URL(req.url)
  const dailyChallengeId = url.searchParams.get("dailyChallengeId")

  if (!dailyChallengeId) {
    return errorResponse(400, "validation_error", "dailyChallengeId is required")
  }

  const result = await sessionService.getContinueDailyChallenge(actor, dailyChallengeId)
  return successResponse(result)
})
