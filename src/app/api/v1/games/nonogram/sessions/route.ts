import { NextRequest } from "next/server";
import { withAuth } from "../route-helpers";
import { sessionService } from "@/lib/server/puzzles/nonogram/services/SessionService";
import { sessionStartSchema, sessionListQuerySchema } from "@/lib/server/puzzles/nonogram/validators";
import { successResponse } from "@/lib/server/utils/apiResponse";
import NonogramPuzzle from "@/lib/server/models/NonogramPuzzle";

export const POST = withAuth(async (req) => {
  const body = await req.json();
  const parsed = sessionStartSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { success: false, payload: { error: { code: "validation_error", message: parsed.error.issues[0].message } }, timestamp: Date.now() },
      { status: 400 }
    );
  }

  const puzzle = await NonogramPuzzle.findOne({ puzzleId: parsed.data.puzzleId }).lean();
  if (!puzzle) {
    return Response.json(
      { success: false, payload: { error: { code: "puzzle_not_found", message: "Puzzle not found." } }, timestamp: Date.now() },
      { status: 404 }
    );
  }

  const session = await sessionService.startSession({
    userId: req.headers.get("x-user-id") || "",
    ...parsed.data,
  });

  return successResponse({
    sessionId: session._id,
    puzzleId: session.puzzleId,
    difficulty: session.difficulty,
    status: session.status,
    grid: session.grid,
    startedAt: session.startedAt,
  }, 201);
});

export const GET = withAuth(async (req) => {
  const url = new URL(req.url);
  const parsed = sessionListQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return Response.json(
      { success: false, payload: { error: { code: "validation_error", message: parsed.error.issues[0].message } }, timestamp: Date.now() },
      { status: 400 }
    );
  }

  const result = await sessionService.listSessions(req.headers.get("x-user-id") || "", parsed.data);
  return successResponse(result);
});
