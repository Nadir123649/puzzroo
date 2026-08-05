import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { getResumableSession } from "@/lib/server/services/sudoku/sessionService";
import { rateLimit } from "@/lib/server/utils/http";
import { withAuth } from "../route-helpers";

export const GET = withAuth(async (req: NextRequest, actor) => {
  if (!rateLimit(req, "sudoku-continue", 30)) {
    return errorResponse(429, "rate_limited", "Too many requests");
  }
  const difficulty = new URL(req.url).searchParams.get("difficulty") || undefined;
  const result = await getResumableSession(actor, "sudoku", difficulty);
  return successResponse(result);
});
