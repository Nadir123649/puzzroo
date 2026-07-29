import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { replayPuzzle, getSession } from "@/lib/server/services/sudoku/sessionService";
import { rateLimit } from "@/lib/server/utils/http";
import { withAuth } from "../../../route-helpers";

export const POST = withAuth(async (req: NextRequest, user, params) => {
  if (!rateLimit(req, "sudoku-replay", 15)) {
    return errorResponse(429, "rate_limited", "Too many requests");
  }

  const existingSession = await getSession(params.id, user.id);
  const result = await replayPuzzle(user.id, existingSession.puzzleId);
  return successResponse(result, 201);
});
