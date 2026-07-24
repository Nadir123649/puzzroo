import { NextRequest } from "next/server"
import { withAuth } from "../../../route-helpers"
import PlaySession from "@/lib/server/models/PlaySession"
import { successResponse } from "@/lib/server/utils/apiResponse"
import { completeSession } from "@/lib/server/tangram/services/verification.service"

export const POST = withAuth(async (req, user, params) => {
  const { id } = params
  const body = await req.json().catch(() => ({}))
  const { pieceStates, elapsedSeconds, hintsUsed, mistakes } = body

  const session = await PlaySession.findOne({ _id: id, userId: user.id })
  if (!session) {
    return Response.json(
      { success: false, payload: { error: { code: "session_not_found", message: "Session not found." } }, timestamp: Date.now() },
      { status: 404 }
    )
  }

  const result = await completeSession(
    id,
    user.id,
    pieceStates || session.pieceStates,
    elapsedSeconds ?? session.elapsedSeconds ?? 0,
    hintsUsed ?? session.hintsUsed ?? 0,
    mistakes ?? session.mistakes ?? 0,
  )

  if (!result.success) {
    return successResponse({
      completed: false,
      accuracy: result.result.accuracy,
      message: "Puzzle is not complete.",
    })
  }

  const updated = result.session!
  return successResponse({
    completed: true,
    sessionId: updated._id.toString(),
    elapsedSeconds: updated.elapsedSeconds || 0,
    hintsUsed: updated.hintsUsed || 0,
    mistakes: updated.mistakes || 0,
    completedAt: updated.completedAt?.toISOString?.() || new Date().toISOString(),
  })
})
