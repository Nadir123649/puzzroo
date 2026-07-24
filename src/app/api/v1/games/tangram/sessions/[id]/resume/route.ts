import { NextRequest } from "next/server"
import { withAuth } from "../../../route-helpers"
import { resumeSession } from "@/lib/server/tangram/services/session.service"
import { successResponse } from "@/lib/server/utils/apiResponse"

export const POST = withAuth(async (req, user, params) => {
  const { id } = params
  const session = await resumeSession(id, user.id)
  return successResponse({
    _id: session._id.toString(),
    status: session.status,
    resumedAt: session.resumedAt?.toISOString?.() || new Date().toISOString(),
  })
})
