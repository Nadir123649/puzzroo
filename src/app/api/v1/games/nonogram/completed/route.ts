import { NextRequest } from "next/server"
import { withAuth } from "../route-helpers"
import type { Actor } from "../route-helpers"
import { sessionService } from "@/lib/server/puzzles/nonogram/services/SessionService"
import { successResponse } from "@/lib/server/utils/apiResponse"

export const GET = withAuth(async (req: NextRequest, actor: Actor) => {
  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "20"), 100)
  const skip = parseInt(url.searchParams.get("skip") || "0")

  const { sessions, total } = await sessionService.getCompletedPuzzles(actor, { limit, skip })

  return successResponse({ sessions, total, limit, skip })
})
