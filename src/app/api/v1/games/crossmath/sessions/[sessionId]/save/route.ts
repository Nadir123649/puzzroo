import { NextRequest } from "next/server"
import { withAuth } from "../../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/crossmath/services/SessionService"
import { saveProgressSchema } from "@/lib/server/puzzles/crossmath/validators"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { rateLimit } from "@/lib/server/utils/http"

export const POST = withAuth(async (req, user, params) => {
  console.log('[TRACE] POST /save', { sessionId: params.sessionId?.substring(0,20), userId: user.id?.substring(0,10), ts: Date.now() })
  if (!rateLimit(req, "crossmath-save", 60)) {
    return errorResponse(429, "rate_limited", "Too many requests")
  }
  const { sessionId } = params
  const body = await req.json()
  const parsed = saveProgressSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { success: false, version: "1.0.0", payload: { error: { code: "validation_error", message: parsed.error.issues[0].message } }, serverTimestamp: new Date().toISOString() },
      { status: 400 }
    )
  }

  const result = await sessionService.saveProgress(
    sessionId,
    user.id,
    parsed.data.grid,
    parsed.data.elapsedTime,
    parsed.data.hintsUsed,
    parsed.data.mistakes,
    parsed.data.moves
  )
  console.log('[TRACE] POST /save: result', { sessionId: sessionId?.substring(0,20), status: result.sessionStatus, ts: Date.now() })
  return successResponse(result)
})

export const PUT = POST
