import { NextRequest } from "next/server"
import { withAuth } from "../../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/crossmath/services/SessionService"
import { statisticsService } from "@/lib/server/puzzles/crossmath/services/StatisticsService"
import { completeSessionSchema } from "@/lib/server/puzzles/crossmath/validators"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { rateLimit } from "@/lib/server/utils/http"

export const POST = withAuth(async (req, user, params) => {
  console.log('[TRACE] POST /complete', { sessionId: params.sessionId?.substring(0,20), userId: user.id?.substring(0,10), ts: Date.now() })
  if (!rateLimit(req, "crossmath-complete", 15)) {
    return errorResponse(429, "rate_limited", "Too many requests")
  }
  const { sessionId } = params
  const body = await req.json()
  const parsed = completeSessionSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { success: false, version: "1.0.0", payload: { error: { code: "validation_error", message: parsed.error.issues[0].message } }, serverTimestamp: new Date().toISOString() },
      { status: 400 }
    )
  }

  const result = await sessionService.completeSession(
    sessionId,
    user.id,
    parsed.data.grid,
    parsed.data.elapsedTime,
    parsed.data.hintsUsed,
    parsed.data.mistakes,
    parsed.data.moves
  )

  console.log('[TRACE] POST /complete: result', { sessionId: sessionId?.substring(0,20), isCompleted: result.isCompleted, ts: Date.now() })

  if (result.isCompleted && result.result) {
    statisticsService.updateOnSessionComplete(
      user.id,
      result.result.puzzleId,
      result.result.difficulty,
      result.result.elapsedTime,
      result.result.hintsUsed,
      result.result.mistakes,
      result.result.accuracy
    ).catch(err => console.error('[crossmath] stats update failed', err))
  }

  return successResponse(result)
})
