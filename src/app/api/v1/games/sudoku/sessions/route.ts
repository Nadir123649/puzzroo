import { NextRequest } from "next/server";
import { successResponse } from "@/lib/server/utils/apiResponse";
import { validate } from "@/lib/server/middleware/validate";
import { createSessionSchema } from "@/lib/server/validators/sudokuValidator";
import { createSession, getActiveSession } from "@/lib/server/services/sudoku/sessionService";
import { withAuth } from "../route-helpers";

export const POST = withAuth(async (req: NextRequest, actor) => {
  let body: any = {};
  try { body = await req.json(); } catch {}

  const val = validate(createSessionSchema, body);
  if (val.error) return val.error;

  const session = await createSession(actor, val.data!.puzzleId);
  return successResponse(session, 201);
});

export const GET = withAuth(async (_req, actor) => {
  const session = await getActiveSession(actor);
  return successResponse(session);
});
