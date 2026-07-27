import { NextRequest } from "next/server"
import { withAuth } from "../route-helpers"
import { sessionService } from "@/lib/server/puzzles/nonogram/services/SessionService"
import { startSessionSchema } from "@/lib/server/puzzles/nonogram/validators"
import { successResponse } from "@/lib/server/utils/apiResponse"

export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  const parsed = startSessionSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { success: false, payload: { error: { code: "validation_error", message: parsed.error.issues[0].message } } },
      { status: 400 }
    )
  }

  const session = await sessionService.startSession(user.id, parsed.data.puzzleId)
  return successResponse(session, 201)
})
