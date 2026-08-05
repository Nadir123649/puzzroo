import { NextRequest } from "next/server"
import { withAuth } from "../../../route-helpers"
import type { Actor } from "../../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/nonogram/services/SessionService"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { rateLimit } from "@/lib/server/utils/http"

export const POST = withAuth(async (req: NextRequest, actor: Actor, params: any) => {
  if (!rateLimit(req, "nonogram-replay", 15)) {
    return errorResponse(429, "rate_limited", "Too many requests")
  }

  const session = await sessionService.getSession(params.id, actor)
  const newSession = await sessionService.replaySession(actor, session.puzzleId)
  return successResponse(newSession, 201)
})
