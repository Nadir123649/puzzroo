import { NextRequest } from "next/server"
import { withAuth } from "../route-helpers"
import { sessionService } from "@/lib/server/puzzles/crossmath/services/SessionService"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { rateLimit } from "@/lib/server/utils/http"

export const GET = withAuth(async (req, user) => {
  console.log('[TRACE] GET /crossmath/continue', { userId: user.id?.substring(0,10), ts: Date.now() })
  if (!rateLimit(req, "crossmath-continue", 30)) {
    console.log('[TRACE] GET /crossmath/continue: rate limited', { ts: Date.now() })
    return errorResponse(429, "rate_limited", "Too many requests")
  }
  const result = await sessionService.getContinuePlaying(user.id)
  console.log('[TRACE] GET /crossmath/continue: response', { hasActiveSession: result.hasActiveSession, ts: Date.now() })
  return successResponse(result)
})
