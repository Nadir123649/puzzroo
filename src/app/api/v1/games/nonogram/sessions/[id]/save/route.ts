import { NextRequest } from "next/server";
import { withAuth } from "../../../route-helpers";
import { sessionService } from "@/lib/server/puzzles/nonogram/services/SessionService";
import { sessionSaveSchema } from "@/lib/server/puzzles/nonogram/validators";
import { successResponse } from "@/lib/server/utils/apiResponse";

export const POST = withAuth(async (req, user, params) => {
  const { id } = params;
  const body = await req.json();
  const parsed = sessionSaveSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { success: false, payload: { error: { code: "validation_error", message: parsed.error.issues[0].message } }, timestamp: Date.now() },
      { status: 400 }
    );
  }

  const session = await sessionService.saveProgress(id, user.id, parsed.data);
  return successResponse({
    sessionId: session._id,
    status: session.status,
    lastSaveAt: session.lastSaveAt,
    elapsedSeconds: session.elapsedSeconds,
  });
});
