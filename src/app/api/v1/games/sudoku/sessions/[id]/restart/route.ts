import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { restartSession } from "@/lib/server/services/sudoku/sessionService";
import { rateLimit } from "@/lib/server/utils/http";
import { withAuth } from "../../../route-helpers";

export const POST = withAuth(async (_req, actor, params) => {
  if (!rateLimit(_req, "sudoku-restart", 15)) {
    return errorResponse(429, "rate_limited", "Too many requests");
  }
  const session = await restartSession(params.id, actor);
  return successResponse(session);
});
