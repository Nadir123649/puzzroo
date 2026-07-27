import { successResponse } from "@/lib/server/utils/apiResponse";
import { restartSession } from "@/lib/server/services/sudoku/sessionService";
import { withAuth } from "../../../route-helpers";

export const POST = withAuth(async (_req, user, params) => {
  const session = await restartSession(params.id, user.id);
  return successResponse(session);
});
