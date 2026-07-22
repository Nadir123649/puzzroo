import { NextRequest } from "next/server"
import { withAuth } from "../../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/crossmath/services/SessionService"
import { replaySessionSchema } from "@/lib/server/puzzles/crossmath/validators"
import { successResponse } from "@/lib/server/utils/apiResponse"

export const POST = withAuth(async (req, user, params) => {
  const { sessionId } = params
  const body = await req.json()
  const parsed = replaySessionSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { success: false, payload: { error: { code: "validation_error", message: parsed.error.issues[0].message } }, timestamp: Date.now() },
      { status: 400 }
    )
  }

  const session = await sessionService.replaySession(user.id, parsed.data.puzzleId)
  return successResponse(session, 201)
})
