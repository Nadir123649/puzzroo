import { NextRequest } from "next/server"
import { withAuth } from "../../route-helpers"
import type { Actor } from "../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/tangram/services/SessionService"
import { startDailySessionSchema } from "@/lib/server/puzzles/tangram/validators"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { rateLimit } from "@/lib/server/utils/http"

export const POST = withAuth(async (req: NextRequest, actor: Actor) => {
  if (!rateLimit(req, "tangram-daily-sessions", 60)) {
    return errorResponse(429, "rate_limited", "Too many requests")
  }
  const body = await req.json()
  const parsed = startDailySessionSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(400, "validation_error", parsed.error.issues[0].message)
  }

  const session = await sessionService.startDailyChallenge(
    actor,
    parsed.data.puzzleId,
    parsed.data.dailyChallengeId
  )
  return successResponse(session, 201)
})
