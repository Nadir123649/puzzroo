import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";
import { replayPuzzle, getSession } from "@/lib/server/services/sudoku/sessionService";
import { auth } from "@/lib/server/middleware/auth";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const userResult = await auth(_request);
  if ("error" in userResult) return userResult.error;

  try {
    const { id } = await params;

    const existingSession = await getSession(id, userResult.user.id);
    if (!existingSession) return errorResponse(404, "session_not_found", "Session not found");

    const session = await replayPuzzle(userResult.user.id, existingSession.puzzleId);
    if (!session) return errorResponse(404, "puzzle_not_found", "Puzzle not found");

    return successResponse(session, 201);
  } catch (error: any) {
    console.error("[sudoku/replay]", error);
    return errorResponse(500, "internal_error", "Internal Server Error");
  }
}
