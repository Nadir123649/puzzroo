import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { validate } from "@/lib/server/middleware/validate";
import { saveProgressSchema } from "@/lib/server/validators/sudokuValidator";
import { autosave } from "@/lib/server/services/sudoku/sessionService";
import { auth } from "@/lib/server/middleware/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userResult = await auth(request);
  if ("error" in userResult) return userResult.error;

  let body: any = {};
  try { body = await request.json(); } catch {}

  const val = validate(saveProgressSchema, body);
  if (val.error) return val.error;

  try {
    const { id } = await params;
    const session = await autosave(id, userResult.user.id, val.data!);
    if (!session) return errorResponse(400, "cannot_autosave", "Session cannot be saved");

    return successResponse(session);
  } catch (error: any) {
    console.error("[sudoku/autosave]", error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
