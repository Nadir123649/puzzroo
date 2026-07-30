import { NextRequest } from "next/server"
import { withAuth } from "../route-helpers"
import type { Actor } from "../route-helpers"
import { getRecentSessions } from "@/lib/server/services/sudoku/sessionService"
import { successResponse } from "@/lib/server/utils/apiResponse"

export const GET = withAuth(async (req: NextRequest, actor: Actor) => {
  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "10"), 50)
  const sessions = await getRecentSessions(actor, limit)
  return successResponse({ sessions })
})
