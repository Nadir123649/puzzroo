import { NextRequest } from "next/server";
import { auth } from "@/lib/server/middleware/auth";
import { connectDB } from "@/lib/server/db";
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse";

type Handler = (req: NextRequest, user: { id: string; role: string; jti?: string }, params?: any) => Promise<Response>;

export function withAuth(handler: Handler) {
  return async (req: NextRequest, context?: { params?: any }) => {
    const authResult = await auth(req);
    if (authResult.error) {
      return authResult.error;
    }
    await connectDB();
    try {
      return await handler(req, authResult.user!, context?.params);
    } catch (error: any) {
      const code = error.message || "internal_error";
      const status = getErrorStatus(code);
      return errorResponse(status, code, getErrorMessage(code));
    }
  };
}

function getErrorStatus(code: string): number {
  const statusMap: Record<string, number> = {
    puzzle_not_found: 404,
    session_not_found: 404,
    not_owner: 403,
    session_not_paused: 400,
    session_not_active: 400,
    already_completed: 400,
    session_abandoned: 400,
    invalid_grid_dimensions: 400,
    no_puzzles_available: 404,
    no_daily_puzzles_available: 404,
    invalid_difficulty: 400,
  };
  return statusMap[code] || 500;
}

function getErrorMessage(code: string): string {
  const msgMap: Record<string, string> = {
    puzzle_not_found: "Puzzle not found.",
    session_not_found: "Session not found.",
    not_owner: "You do not own this session.",
    session_not_paused: "Session is not paused.",
    session_not_active: "Session is not active.",
    already_completed: "Session already completed.",
    session_abandoned: "Session has been abandoned.",
    invalid_grid_dimensions: "Invalid grid dimensions.",
    no_puzzles_available: "No puzzles available.",
    no_daily_puzzles_available: "No daily puzzles available.",
    invalid_difficulty: "Invalid difficulty level.",
  };
  return msgMap[code] || "An unexpected error occurred.";
}
