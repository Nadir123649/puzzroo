import { withAuth } from "../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/tangram/services/SessionService"
import { successResponse } from "@/lib/server/utils/apiResponse"

export const GET = withAuth(async (_req, user, params) => {
  const session = await sessionService.getSession(params.id, user.id)
  return successResponse(session)
})