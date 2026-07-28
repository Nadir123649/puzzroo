import { withAuth } from "../../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/nonogram/services/SessionService"
import { successResponse } from "@/lib/server/utils/apiResponse"

export const POST = withAuth(async (_req, user, params) => {
  const session = await sessionService.restartSession(params.id, user.id)
  return successResponse(session)
})
