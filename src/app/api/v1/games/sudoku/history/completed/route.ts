import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { validate } from "@/lib/server/middleware/validate";
import { historyQuerySchema } from "@/lib/server/validators/sudokuValidator";
import { getCompletedGames } from "@/lib/server/services/sudoku/sessionService";
import { withAuth } from "../../route-helpers";

export const GET = withAuth(async (request: NextRequest, actor, _params) => {
  const q = validate(historyQuerySchema, Object.fromEntries(new URL(request.url).searchParams));
  if (q.error) return q.error;

  try {
    const { cursor, limit } = q.data!;
    const sessions = await getCompletedGames(actor, cursor, limit);

    return successResponse({
      sessions,
      cursor: sessions.length === limit ? String(sessions[sessions.length - 1].id) : null,
    });
  } catch (error: any) {
    console.error("[sudoku/history/completed]", error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
});
