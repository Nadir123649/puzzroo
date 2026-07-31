import { NextRequest } from "next/server";
import { successResponse } from "@/lib/server/utils/apiResponse";
import { getResumableSession } from "@/lib/server/services/sudoku/sessionService";
import { withAuth } from "../../route-helpers";

export const GET = withAuth(async (_req: NextRequest, actor, _params) => {
  const result = await getResumableSession(actor, "daily_challenge");
  return successResponse(result);
});