import { successResponse } from "@/lib/server/utils/apiResponse";
import { pauseSession } from "@/lib/server/services/sudoku/sessionService";
import { withAuth } from "../../../route-helpers";

export const PATCH = withAuth(async (_req, user, params) => {
  const session = await pauseSession(params.id, user.id);
  return successResponse(session);
});
