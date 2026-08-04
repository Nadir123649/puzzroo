import { NextRequest } from "next/server"
import { withAuth } from "../../../route-helpers"
import type { Actor } from "../../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/tangram/services/SessionService"
import { saveProgressSchema } from "@/lib/server/puzzles/tangram/validators"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { rateLimit } from "@/lib/server/utils/http"

const handler = withAuth(async (req: NextRequest, actor: Actor, params: any) => {
  if (!rateLimit(req, "tangram-save", 60)) {
    return errorResponse(429, "rate_limited", "Too many requests")
  }

  let body: any = {}
  try { body = await req.json() } catch {}

  const parsed = saveProgressSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(400, "validation_error", parsed.error.issues[0].message)
  }

  const { pieceStates, elapsedSeconds, hintsUsed, mistakes, moves } = parsed.data

  const session = await sessionService.saveProgress(
    params.id, actor, pieceStates, elapsedSeconds, hintsUsed, mistakes, moves || 0
  )

  return successResponse(session)
})

export const POST = handler
export const PUT = handler
