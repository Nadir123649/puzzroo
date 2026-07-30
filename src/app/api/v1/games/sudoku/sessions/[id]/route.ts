import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/server/utils/apiResponse";
import { getSession } from "@/lib/server/services/sudoku/sessionService";
import { withAuth } from "../../route-helpers";

export const GET = withAuth(async (_req: NextRequest, actor, params) => {
  const { id } = params;
  const session = await getSession(id, actor);
  if (!session) return errorResponse(404, "session_not_found", "Session not found");

  return Response.json({ success: true, version: "1.0.0", payload: session, serverTimestamp: new Date().toISOString() });
});
