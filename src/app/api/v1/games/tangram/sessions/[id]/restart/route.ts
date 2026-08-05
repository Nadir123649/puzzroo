import { NextRequest } from "next/server"
import { withAuth } from "../../../route-helpers"
import type { Actor } from "../../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/tangram/services/SessionService"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { rateLimit } from "@/lib/server/utils/http"

export const POST = withAuth(async (req: NextRequest, actor: Actor, params: any) => {
  if (!rateLimit(req, "tangram-restart", 15)) {
    return errorResponse(429, "rate_limited", "Too many requests")
  }
  const session = await sessionService.restartSession(params.id, actor)
  return successResponse(session)
})
