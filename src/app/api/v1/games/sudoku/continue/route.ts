import { NextRequest } from "next/server";
import { successResponse } from "@/lib/server/utils/apiResponse";
import { getResumableSession } from "@/lib/server/services/sudoku/sessionService";
import { withAuth } from "../route-helpers";

export const GET = withAuth(async (req: NextRequest, actor) => {
  const difficulty = new URL(req.url).searchParams.get("difficulty") || undefined;
  const result = await getResumableSession(actor, "sudoku", difficulty);
  return successResponse(result);
});
