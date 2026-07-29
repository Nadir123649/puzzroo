import { NextRequest } from "next/server"
import { withAuth } from "../route-helpers"
import { sessionService } from "@/lib/server/puzzles/crossmath/services/SessionService"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { rateLimit } from "@/lib/server/utils/http"

export const GET = withAuth(async (req, user) => {
  if (!rateLimit(req, "crossmath-continue", 30)) {
    return errorResponse(429, "rate_limited", "Too many requests")
  }
  const result = await sessionService.getContinuePlaying(user.id)
  return successResponse(result)
})
