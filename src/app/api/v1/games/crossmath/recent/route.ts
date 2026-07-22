import { NextRequest } from "next/server"
import { withAuth } from "../route-helpers"
import { sessionService } from "@/lib/server/puzzles/crossmath/services/SessionService"
import { successResponse } from "@/lib/server/utils/apiResponse"

export const GET = withAuth(async (req, user) => {
  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "10"), 50)
  const sessions = await sessionService.getRecentSessions(user.id, limit)
  return successResponse({ sessions })
})
