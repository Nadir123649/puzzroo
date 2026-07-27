import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { validate } from "@/lib/server/middleware/validate";
import { saveProgressSchema } from "@/lib/server/validators/sudokuValidator";
import { saveProgress } from "@/lib/server/services/sudoku/sessionService";
import { rateLimit } from "@/lib/server/utils/http";
import { withAuth } from "../../../route-helpers";

const handler = withAuth(async (req: NextRequest, user, params) => {
  if (!rateLimit(req, "sudoku-save", 60)) {
    return errorResponse(429, "rate_limited", "Too many requests");
  }

  let body: any = {};
  try { body = await req.json(); } catch {}

  const val = validate(saveProgressSchema, body);
  if (val.error) return val.error;

  const session = await saveProgress(params.id, user.id, val.data!);
  return successResponse(session);
});

export const PUT = handler;
export const POST = handler;
