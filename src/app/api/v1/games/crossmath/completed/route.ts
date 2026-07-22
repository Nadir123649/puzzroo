import { NextRequest } from "next/server"
import { withAuth } from "../route-helpers"
import { sessionService } from "@/lib/server/puzzles/crossmath/services/SessionService"
import { successResponse } from "@/lib/server/utils/apiResponse"

export const GET = withAuth(async (req, user) => {
  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100)
  const skip = parseInt(url.searchParams.get("skip") || "0")

  const result = await sessionService.getCompletedPuzzles(user.id, { limit, skip })
  return successResponse(result)
})
