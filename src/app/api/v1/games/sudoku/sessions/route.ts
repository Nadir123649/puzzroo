import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { validate } from "@/lib/server/middleware/validate";
import { createSessionSchema } from "@/lib/server/validators/sudokuValidator";
import { createSession, getActiveSession } from "@/lib/server/services/sudoku/sessionService";
import { rateLimit } from "@/lib/server/utils/http";
import { withAuth } from "../route-helpers";

export const POST = withAuth(async (req: NextRequest, actor) => {
  if (!rateLimit(req, "sudoku-sessions", 60)) {
    return errorResponse(429, "rate_limited", "Too many requests");
  }
  let body: any = {};
  try { body = await req.json(); } catch {}

  const val = validate(createSessionSchema, body);
  if (val.error) return val.error;

  const session = await createSession(actor, val.data!.puzzleId);
  return successResponse(session, 201);
});

export const GET = withAuth(async (req, actor) => {
  if (!rateLimit(req, "sudoku-sessions", 60)) {
    return errorResponse(429, "rate_limited", "Too many requests");
  }
  const session = await getActiveSession(actor);
  return successResponse(session);
});
