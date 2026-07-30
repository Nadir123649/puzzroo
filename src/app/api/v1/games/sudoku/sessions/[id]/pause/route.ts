import { successResponse } from "@/lib/server/utils/apiResponse";
import { pauseSession } from "@/lib/server/services/sudoku/sessionService";
import { withAuth } from "../../../route-helpers";

export const PATCH = withAuth(async (_req, actor, params) => {
  const session = await pauseSession(params.id, actor);
  return successResponse(session);
});
