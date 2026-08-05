import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { resumeSession } from "@/lib/server/services/sudoku/sessionService";
import { rateLimit } from "@/lib/server/utils/http";
import { withAuth } from "../../../route-helpers";

export const PATCH = withAuth(async (_req, actor, params) => {
  if (!rateLimit(_req, "sudoku-resume", 30)) {
    return errorResponse(429, "rate_limited", "Too many requests");
  }
  const session = await resumeSession(params.id, actor);
  return successResponse(session);
});
