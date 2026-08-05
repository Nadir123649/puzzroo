import { NextRequest } from "next/server"
import { withAuth } from "../../../route-helpers"
import type { Actor } from "../../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/nonogram/services/SessionService"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { rateLimit } from "@/lib/server/utils/http"

export const GET = withAuth(async (req: NextRequest, actor: Actor, params: any) => {
  if (!rateLimit(req, "nonogram-result", 30)) {
    return errorResponse(429, "rate_limited", "Too many requests")
  }
  const session = await sessionService.getSession(params.id, actor)

  if (session.sessionStatus !== "completed") {
    return errorResponse(400, "session_not_completed", "Session is not completed.")
  }

  return successResponse(session)
})
