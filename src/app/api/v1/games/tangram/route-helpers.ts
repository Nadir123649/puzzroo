import { NextRequest } from "next/server"
import { auth } from "@/lib/server/middleware/auth"
import { connectDB } from "@/lib/server/db"
import { errorResponse } from "@/lib/server/utils/apiResponse"

export type Actor =
  | { type: "user"; id: string; role: string; jti?: string }
  | { type: "guest"; id: string }

type Handler = (
  req: NextRequest,
  actor: Actor,
  params?: any
) => Promise<Response>

export function withAuth(handler: Handler) {
  return async (req: NextRequest, context?: { params?: any }) => {
    await connectDB()

    const authResult = await auth(req)
    if (!authResult.error) {
      const resolvedParams = context?.params ? await context.params : undefined
      return runHandler(handler, req, { type: "user", ...authResult.user! }, resolvedParams)
    }

    const guestId = req.headers.get("x-guest-id")
    if (guestId) {
      const resolvedParams = context?.params ? await context.params : undefined
      return runHandler(handler, req, { type: "guest", id: guestId }, resolvedParams)
    }

    return authResult.error
  }
}

async function runHandler(handler: Handler, req: NextRequest, actor: Actor, params: any) {
  try {
    return await handler(req, actor, params)
  } catch (error: any) {
    const code = error.message || "internal_error"
    const status = getErrorStatus(code)
    return errorResponse(status, code, getErrorMessage(code))
  }
}

function getErrorStatus(code: string): number {
  const statusMap: Record<string, number> = {
    puzzle_not_found: 404,
    session_not_found: 404,
    not_owner: 403,
    session_not_active: 400,
    session_not_paused: 400,
    already_completed: 400,
    already_abandoned: 400,
    session_abandoned: 400,
    no_puzzles_available: 404,
    no_daily_puzzles_available: 404,
    invalid_pattern: 500,
  }
  return statusMap[code] || 500
}

function getErrorMessage(code: string): string {
  const msgMap: Record<string, string> = {
    puzzle_not_found: "Puzzle not found.",
    session_not_found: "Session not found.",
    not_owner: "You do not own this session.",
    session_not_active: "Session is not active.",
    session_not_paused: "Session is not paused.",
    already_completed: "Session already completed.",
    already_abandoned: "Session already abandoned.",
    session_abandoned: "Session has been abandoned.",
    no_puzzles_available: "No puzzles available.",
    no_daily_puzzles_available: "No daily puzzles available.",
    invalid_pattern: "Invalid puzzle pattern.",
  }
  return msgMap[code] || "An unexpected error occurred."
}
