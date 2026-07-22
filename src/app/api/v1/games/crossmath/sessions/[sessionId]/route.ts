import { NextRequest } from "next/server"
import { withAuth } from "../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/crossmath/services/SessionService"
import { successResponse } from "@/lib/server/utils/apiResponse"

export const GET = withAuth(async (req, user, params) => {
  const { sessionId } = params
  const session = await sessionService.getSession(sessionId, user.id)
  return successResponse(session)
})
