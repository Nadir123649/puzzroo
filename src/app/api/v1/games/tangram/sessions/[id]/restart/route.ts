import { NextRequest } from "next/server"
import { withAuth } from "../../../route-helpers"
import { restartSession } from "@/lib/server/tangram/services/session.service"
import { successResponse } from "@/lib/server/utils/apiResponse"

export const POST = withAuth(async (req, user, params) => {
  const { id } = params
  const session = await restartSession(id, user.id)
  return successResponse({
    _id: session._id.toString(),
    status: session.status,
    pieceStates: session.pieceStates,
    elapsedSeconds: 0,
    hintsUsed: 0,
    mistakes: 0,
    restartCount: session.restartCount || 0,
  })
})
