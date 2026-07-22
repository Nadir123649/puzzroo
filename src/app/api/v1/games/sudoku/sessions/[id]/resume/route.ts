import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { resumeSession } from "@/lib/server/services/sudoku/sessionService";
import { auth } from "@/lib/server/middleware/auth";

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userResult = await auth(_request);
  if ("error" in userResult) return userResult.error;

  try {
    const { id } = await params;
    const session = await resumeSession(id, userResult.user.id);
    if (!session) return errorResponse(400, "cannot_resume", "Session cannot be resumed");

    return successResponse(session);
  } catch (error: any) {
    console.error("[sudoku/resume]", error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
