import { NextRequest } from "next/server"
import { withAuth } from "../../route-helpers"
import type { Actor } from "../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/crossmath/services/SessionService"
import { startDailySessionSchema } from "@/lib/server/puzzles/crossmath/validators"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"

export const POST = withAuth(async (req: NextRequest, actor: Actor) => {
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
