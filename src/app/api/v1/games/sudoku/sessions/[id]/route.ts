import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { getSession } from "@/lib/server/services/sudoku/sessionService";
import { auth } from "@/lib/server/middleware/auth";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userResult = await auth(_request);
  if ("error" in userResult) return userResult.error;

  try {
    const { id } = await params;
    const session = await getSession(id, userResult.user.id);
    if (!session) return errorResponse(404, "session_not_found", "Session not found");

    return successResponse(session);
  } catch (error: any) {
    console.error("[sudoku/sessions/id GET]", error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
