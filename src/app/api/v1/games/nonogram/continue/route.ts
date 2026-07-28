import { sessionService } from "@/lib/server/puzzles/nonogram/services/SessionService"
import { successResponse } from "@/lib/server/utils/apiResponse"
import { withAuth } from "../route-helpers"

export const GET = withAuth(async (_req, user) => {
  const result = await sessionService.getContinuePlaying(user.id)
  return successResponse(result)
})

