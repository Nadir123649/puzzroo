import { NextRequest } from "next/server"
import { withAuth } from "../../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/tangram/services/SessionService"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { rateLimit } from "@/lib/server/utils/http"

export const POST = withAuth(async (req, user, params) => {
  if (!rateLimit(req, "tangram-complete", 30)) {
    return errorResponse(429, "rate_limited", "Too many requests")
  }

  let body: any = {}
  try { body = await req.json() } catch {}

  const { grid, pieces, elapsedTime, hintsUsed, mistakes, moves } = body

  const result = await sessionService.completeSession(
    params.id, user.id, grid, pieces, elapsedTime, hintsUsed, mistakes, moves
  )

  return successResponse(result)
})