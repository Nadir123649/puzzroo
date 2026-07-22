import { NextRequest } from "next/server";
import { withAuth } from "../../../route-helpers";
import { sessionService } from "@/lib/server/puzzles/nonogram/services/SessionService";
import { successResponse } from "@/lib/server/utils/apiResponse";

export const POST = withAuth(async (req, user, params) => {
  const { id } = params;
  const session = await sessionService.restartSession(id, user.id);
  return successResponse({
    sessionId: session._id,
    status: session.status,
    restartCount: session.restartCount,
    grid: session.grid,
    startedAt: session.startedAt,
  });
});
