import { successResponse } from "@/lib/server/utils/apiResponse";
import { getResumableSession } from "@/lib/server/services/sudoku/sessionService";
import { withAuth } from "../route-helpers";

export const GET = withAuth(async (_req, user) => {
  const result = await getResumableSession(user.id);
  return successResponse(result);
});
