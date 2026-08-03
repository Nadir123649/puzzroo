import { NextRequest } from "next/server";
import { withAuth } from "../route-helpers";
import type { Actor } from "../route-helpers";
import { sessionService } from "@/lib/server/puzzles/tangram/services/SessionService";
import { sessionHistoryQuerySchema } from "@/lib/server/puzzles/tangram/validators";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";

export const GET = withAuth(async (req: NextRequest, actor: Actor) => {
  const url = new URL(req.url);
  const parsed = sessionHistoryQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return errorResponse(400, "validation_error", parsed.error.issues[0].message);
  }

  const { status, difficulty, limit, skip } = parsed.data;
  const result = await sessionService.getSessionHistory(actor, { status, difficulty, limit, skip });

  return successResponse({ sessions: result.sessions, total: result.total, limit, skip });
});
