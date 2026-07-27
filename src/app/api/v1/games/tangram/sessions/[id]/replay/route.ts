import { withAuth } from "../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/tangram/services/SessionService"
import { successResponse } from "@/lib/server/utils/apiResponse"

export const POST = withAuth(async (_req, user, params) => {
  const session = await sessionService.replaySession(user.id, params.id)
  return successResponse(session, 201)
})