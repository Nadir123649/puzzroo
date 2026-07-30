import { NextRequest } from "next/server"
import { withAuth } from "../route-helpers"
import type { Actor } from "../route-helpers"
import { sessionService } from "@/lib/server/puzzles/crossmath/services/SessionService"
import { sessionHistoryQuerySchema } from "@/lib/server/puzzles/crossmath/validators"
import { successResponse } from "@/lib/server/utils/apiResponse"

export const GET = withAuth(async (req: NextRequest, actor: Actor) => {
  const url = new URL(req.url)
  const parsed = sessionHistoryQuerySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) {
    return Response.json(
      { success: false, payload: { error: { code: "validation_error", message: parsed.error.issues[0].message } }, timestamp: Date.now() },
      { status: 400 }
    )
  }

  const result = await sessionService.getSessionHistory(actor, parsed.data)
  return successResponse(result)
})
