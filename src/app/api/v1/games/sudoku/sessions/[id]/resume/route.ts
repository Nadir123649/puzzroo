import { successResponse } from "@/lib/server/utils/apiResponse";
import { resumeSession } from "@/lib/server/services/sudoku/sessionService";
import { withAuth } from "../../../route-helpers";

export const PATCH = withAuth(async (_req, user, params) => {
  const session = await resumeSession(params.id, user.id);
  return successResponse(session);
});
