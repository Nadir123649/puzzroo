import { NextRequest } from "next/server"
import { withAuth } from "../../../route-helpers"
import type { Actor } from "../../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/tangram/services/SessionService"
import { successResponse } from "@/lib/server/utils/apiResponse"

export const PATCH = withAuth(async (_req: NextRequest, actor: Actor, params: any) => {
  const session = await sessionService.resumeSession(params.id, actor)
  return successResponse(session)
})
