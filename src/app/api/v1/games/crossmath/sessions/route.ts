import { NextRequest } from "next/server"
import { withAuth } from "../route-helpers"
import type { Actor } from "../route-helpers"
import { sessionService } from "@/lib/server/puzzles/crossmath/services/SessionService"
import { startSessionSchema, sessionListQuerySchema } from "@/lib/server/puzzles/crossmath/validators"
import { successResponse } from "@/lib/server/utils/apiResponse"

export const POST = withAuth(async (req: NextRequest, actor: Actor) => {
  const body = await req.json()
  const parsed = startSessionSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { success: false, payload: { error: { code: "validation_error", message: parsed.error.issues[0].message } }, timestamp: Date.now() },
      { status: 400 }
    )
  }

  const session = await sessionService.startSession(actor, parsed.data.puzzleId)
  return successResponse(session, 201)
})

export const GET = withAuth(async (req: NextRequest, actor: Actor) => {
  const url = new URL(req.url)
  const parsed = sessionListQuerySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) {
    return Response.json(
      { success: false, payload: { error: { code: "validation_error", message: parsed.error.issues[0].message } }, timestamp: Date.now() },
      { status: 400 }
    )
  }

  const sessions = await sessionService.getRecentSessions(actor, parsed.data.limit)
  return successResponse({ sessions, total: sessions.length })
})
