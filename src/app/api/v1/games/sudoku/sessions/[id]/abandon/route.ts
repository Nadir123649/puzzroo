import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { abandonSession } from "@/lib/server/services/sudoku/sessionService";
import { updateUserStatsOnAbandon } from "@/lib/server/services/sudoku/statisticsService";
import { rateLimit } from "@/lib/server/utils/http";
import { withAuth } from "../../../route-helpers";

export const POST = withAuth(async (req: NextRequest, user, params) => {
  if (!rateLimit(req, "sudoku-abandon", 30)) {
    return errorResponse(429, "rate_limited", "Too many requests");
  }

  const session = await abandonSession(params.id, user.id);
  updateUserStatsOnAbandon(params.id, user.id).catch(() => {});
  return successResponse(session);
});
