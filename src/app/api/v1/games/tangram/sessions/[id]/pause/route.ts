import { NextRequest } from "next/server"
import { withAuth } from "../../../route-helpers"
import { pauseSession } from "@/lib/server/tangram/services/session.service"
import { successResponse } from "@/lib/server/utils/apiResponse"

export const POST = withAuth(async (req, user, params) => {
  const { id } = params
  const session = await pauseSession(id, user.id)
  return successResponse({
    _id: session._id.toString(),
    status: session.status,
    pausedAt: session.pausedAt?.toISOString?.() || new Date().toISOString(),
  })
})
