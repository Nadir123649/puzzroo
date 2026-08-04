import { NextRequest } from "next/server"
import { withAuth } from "../route-helpers"
import type { Actor } from "../route-helpers"
import { sessionService } from "@/lib/server/puzzles/tangram/services/SessionService"
import { tangramDifficultySchema } from "@/lib/server/puzzles/tangram/validators"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { rateLimit } from "@/lib/server/utils/http"

export const GET = withAuth(async (req: NextRequest, actor: Actor) => {
  if (!rateLimit(req, "tangram-continue", 30)) {
    return errorResponse(429, "rate_limited", "Too many requests")
  }

  const url = new URL(req.url)
  const difficultyParam = url.searchParams.get("difficulty")
  const parsed = tangramDifficultySchema.safeParse(difficultyParam || undefined)
  const difficulty = parsed.success ? parsed.data : undefined

  const result = await sessionService.getContinuePlaying(actor, "tangram", difficulty)
  return successResponse(result)
})
