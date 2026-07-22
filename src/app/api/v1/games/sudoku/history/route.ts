import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { validate } from "@/lib/server/middleware/validate";
import { historyQuerySchema } from "@/lib/server/validators/sudokuValidator";
import { getUserHistory } from "@/lib/server/services/sudoku/sessionService";
import { auth } from "@/lib/server/middleware/auth";

export async function GET(request: NextRequest) {
  const userResult = await auth(request);
  if ("error" in userResult) return userResult.error;

  const q = validate(historyQuerySchema, Object.fromEntries(new URL(request.url).searchParams));
  if (q.error) return q.error;

  try {
    const { status, cursor, limit } = q.data!;
    const sessions = await getUserHistory(userResult.user.id, status, cursor, limit);

    return successResponse({
      sessions,
      cursor: sessions.length === limit ? String(sessions[sessions.length - 1].id) : null,
    });
  } catch (error: any) {
    console.error("[sudoku/history]", error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
