import { NextRequest } from "next/server"
import { withAuth } from "../route-helpers"
import type { Actor } from "../route-helpers"
import { sessionService } from "@/lib/server/puzzles/nonogram/services/SessionService"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { rateLimit } from "@/lib/server/utils/http"

export const GET = withAuth(async (req: NextRequest, actor: Actor) => {
  if (!rateLimit(req, "nonogram-continue", 30)) {
    return errorResponse(429, "rate_limited", "Too many requests")
  }

  const url = new URL(req.url)
  const difficulty = url.searchParams.get("difficulty") || undefined

  const result = await sessionService.getContinuePlaying(actor, "nonogram", difficulty)
  return successResponse(result)
})
