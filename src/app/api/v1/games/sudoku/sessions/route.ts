import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { validate } from "@/lib/server/middleware/validate";
import { createSessionSchema } from "@/lib/server/validators/sudokuValidator";
import { createSession, getActiveSession } from "@/lib/server/services/sudoku/sessionService";
import { auth } from "@/lib/server/middleware/auth";

export async function POST(request: NextRequest) {
  const userResult = await auth(request);
  if ("error" in userResult) return userResult.error;

  let body: any = {};
  try { body = await request.json(); } catch {}

  const val = validate(createSessionSchema, body);
  if (val.error) return val.error;

  try {
    const { puzzleId } = val.data!;
    const session = await createSession(userResult.user.id, puzzleId);
    if (!session) return errorResponse(404, "puzzle_not_found", "Puzzle not found");

    return successResponse(session, 201);
  } catch (error: any) {
    console.error("[sudoku/sessions POST]", error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}

export async function GET(request: NextRequest) {
  const userResult = await auth(request);
  if ("error" in userResult) return userResult.error;

  try {
    const session = await getActiveSession(userResult.user.id);
    if (!session) return successResponse(null);

    return successResponse(session);
  } catch (error: any) {
    console.error("[sudoku/sessions GET]", error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
