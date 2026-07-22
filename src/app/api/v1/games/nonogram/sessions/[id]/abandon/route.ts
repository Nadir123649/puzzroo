import { NextRequest } from "next/server";
import { withAuth } from "../../../route-helpers";
import { sessionService } from "@/lib/server/puzzles/nonogram/services/SessionService";
import { statisticsService } from "@/lib/server/puzzles/nonogram/services/StatisticsService";
import { abandonSessionSchema } from "@/lib/server/puzzles/nonogram/validators";
import { successResponse } from "@/lib/server/utils/apiResponse";

export const POST = withAuth(async (req, user, params) => {
  const { id } = params;
  const body = await req.json().catch(() => ({}));
  const parsed = abandonSessionSchema.safeParse(body);
  const reason = parsed.success ? parsed.data.reason : undefined;

  const session = await sessionService.abandonSession(id, user.id, reason);

  await statisticsService.updateOnSessionAbandon(user.id, session.puzzleId, session.difficulty);

  return successResponse({
    sessionId: session._id,
    status: session.status,
    completedAt: session.completedAt,
  });
});
