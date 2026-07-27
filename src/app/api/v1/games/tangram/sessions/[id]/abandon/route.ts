import { NextRequest } from "next/server"
import { withAuth } from "../../../route-helpers"
import { abandonSession } from "@/lib/server/tangram/services/session.service"
import { successResponse } from "@/lib/server/utils/apiResponse"

export const POST = withAuth(async (req, user, params) => {
  const { id } = params
  const body = await req.json().catch(() => ({}))
  const session = await abandonSession(id, user.id, body.reason)
  return successResponse({
    _id: session._id.toString(),
    status: session.status,
    abandonReason: session.abandonReason || null,
  })
})
