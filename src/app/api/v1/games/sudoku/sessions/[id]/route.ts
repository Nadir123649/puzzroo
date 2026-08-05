import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/server/utils/apiResponse";
import { getSession } from "@/lib/server/services/sudoku/sessionService";
import { rateLimit } from "@/lib/server/utils/http";
import { withAuth } from "../../route-helpers";

export const GET = withAuth(async (req: NextRequest, actor, params) => {
  if (!rateLimit(req, "sudoku-session", 60)) {
    return errorResponse(429, "rate_limited", "Too many requests");
  }
  const { id } = params;
  const session = await getSession(id, actor);
  if (!session) return errorResponse(404, "session_not_found", "Session not found");

  return Response.json({ success: true, version: "1.0.0", payload: session, serverTimestamp: new Date().toISOString() });
});
