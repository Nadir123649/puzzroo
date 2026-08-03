import { NextRequest } from "next/server";
import { withAuth } from "../route-helpers";
import type { Actor } from "../route-helpers";
import { sessionService } from "@/lib/server/puzzles/tangram/services/SessionService";
import { successResponse } from "@/lib/server/utils/apiResponse";

export const GET = withAuth(async (_req: NextRequest, actor: Actor) => {
  const stats = await sessionService.getPlayerStats(actor);
  return successResponse(stats);
});
