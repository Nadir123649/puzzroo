import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { validate } from "@/lib/server/middleware/validate";
import { createSession } from "@/lib/server/services/sudoku/sessionService";
import { withAuth } from "../../route-helpers";
import { z } from "zod";

const startDailySessionSchema = z.object({
  puzzleId: z.string().min(1, "puzzleId is required"),
  dailyChallengeId: z.string().min(1, "dailyChallengeId is required"),
});

export const POST = withAuth(async (req: NextRequest, actor, _params) => {
  let body: any = {};
  try { body = await req.json(); } catch {}

  const val = validate(startDailySessionSchema, body);
  if (val.error) return val.error;

  const session = await createSession(actor, val.data!.puzzleId, "daily_challenge", val.data!.dailyChallengeId);
  return successResponse(session, 201);
});