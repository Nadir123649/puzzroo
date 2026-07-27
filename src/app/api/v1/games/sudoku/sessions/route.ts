import { NextRequest } from "next/server";
import { successResponse } from "@/lib/server/utils/apiResponse";
import { validate } from "@/lib/server/middleware/validate";
import { createSessionSchema } from "@/lib/server/validators/sudokuValidator";
import { createSession, getActiveSession } from "@/lib/server/services/sudoku/sessionService";
import { withAuth } from "../route-helpers";

export const POST = withAuth(async (req: NextRequest, user) => {
  let body: any = {};
  try { body = await req.json(); } catch {}

  const val = validate(createSessionSchema, body);
  if (val.error) return val.error;

  const session = await createSession(user.id, val.data!.puzzleId);
  return successResponse(session, 201);
});

export const GET = withAuth(async (_req, user) => {
  const session = await getActiveSession(user.id);
  return successResponse(session);
});
