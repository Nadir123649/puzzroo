import { withAuth } from "../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/tangram/services/SessionService"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"

export const GET = withAuth(async (_req, user, params) => {
  const session = await sessionService.getSession(params.id, user.id)

  if (session.sessionStatus !== "completed") {
    return errorResponse(400, "session_not_completed", "Session is not completed.")
  }

  return successResponse(session)
})