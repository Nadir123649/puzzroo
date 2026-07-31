import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { abandonSession } from "@/lib/server/services/sudoku/sessionService";
import { updateUserStatsOnAbandon } from "@/lib/server/services/sudoku/statisticsService";
import { rateLimit } from "@/lib/server/utils/http";
import { withAuth } from "../../../route-helpers";

export const POST = withAuth(async (req: NextRequest, actor, params) => {
  if (!rateLimit(req, "sudoku-abandon", 30)) {
    return errorResponse(429, "rate_limited", "Too many requests");
  }

  const session = await abandonSession(params.id, actor);
  if (actor.type === "user") {
    updateUserStatsOnAbandon(params.id, actor.id).catch(() => {});
  }
  return successResponse(session);
});
