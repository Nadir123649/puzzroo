import { NextRequest } from "next/server"
import { withAuth } from "../../../route-helpers"
import { saveProgress } from "@/lib/server/tangram/services/session.service"
import { successResponse } from "@/lib/server/utils/apiResponse"

export const POST = withAuth(async (req, user, params) => {
  const { id } = params
  const body = await req.json()
  const { pieceStates, elapsedSeconds, hintsUsed, mistakes } = body

  const session = await saveProgress(id, user.id, {
    pieceStates: pieceStates || [],
    elapsedSeconds: elapsedSeconds || 0,
    hintsUsed,
    mistakes,
  })

  return successResponse({
    _id: session._id.toString(),
    status: session.status,
    elapsedSeconds: session.elapsedSeconds || 0,
    lastSaveAt: session.lastSaveAt?.toISOString?.() || new Date().toISOString(),
  })
})
