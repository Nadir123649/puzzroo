import { NextRequest } from "next/server"
import { withAuth } from "../../../route-helpers"
import type { Actor } from "../../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/tangram/services/SessionService"
import { statisticsService } from "@/lib/server/puzzles/tangram/services/StatisticsService"
import { successResponse } from "@/lib/server/utils/apiResponse"

export const POST = withAuth(async (_req: NextRequest, actor: Actor, params: any) => {
  const session = await sessionService.abandonSession(params.id, actor)
  if (actor.type === "user") {
    statisticsService.updateOnSessionAbandon(actor.id, session.puzzleId, session.difficulty).catch(() => {})
  }
  return successResponse(session)
})
