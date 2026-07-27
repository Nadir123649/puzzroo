import { withAuth } from "../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/tangram/services/SessionService"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"

export const POST = withAuth(async (_req, user, params) => {
  const session = await sessionService.abandonSession(params.id, user.id)
  return successResponse(session)
})