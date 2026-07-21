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
    return successResponse({ saved: false, error: "validation_error" });
  }

  const session = await sessionService.saveProgress(id, user.id, parsed.data);
  return successResponse({ saved: true, lastSaveAt: session.lastSaveAt });
});
