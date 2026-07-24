import { NextRequest } from "next/server"
import { withAuth } from "../route-helpers"
import { startSession, getRecentSessions } from "@/lib/server/tangram/services/session.service"
import { successResponse } from "@/lib/server/utils/apiResponse"
import TangramPuzzle from "@/lib/server/models/TangramPuzzle"

function toSafeSession(session: any) {
  return {
    _id: session._id.toString(),
    userId: session.userId.toString(),
    puzzleId: session.puzzleId,
    gameType: "tangram",
    difficulty: session.difficulty,
    status: session.status,
    pieceStates: session.pieceStates || [],
    fullPolygon: session.fullPolygon || [],
    mistakes: session.mistakes || 0,
    hintsUsed: session.hintsUsed || 0,
    startedAt: session.startedAt?.toISOString?.() || session.startedAt,
    elapsedSeconds: session.elapsedSeconds || 0,
    piecesPlaced: (session.pieceStates || []).filter((p: any) => p.placed).length,
    totalPieces: (session.pieceStates || []).length || 0,
    isArchived: false,
    lastPlayedAt: session.lastSaveAt?.toISOString?.() || session.updatedAt?.toISOString?.() || new Date().toISOString(),
  }
}

export const POST = withAuth(async (req, user) => {
  const body = await req.json()
  const { puzzleId, difficulty } = body
  if (!puzzleId || !difficulty) {
    return Response.json(
      { success: false, payload: { error: { code: "validation_error", message: "puzzleId and difficulty required" } }, timestamp: Date.now() },
      { status: 400 }
    )
  }

  const puzzle = await TangramPuzzle.findOne({ puzzleId }).lean()
  if (!puzzle) {
    return Response.json(
      { success: false, payload: { error: { code: "puzzle_not_found", message: "Puzzle not found." } }, timestamp: Date.now() },
      { status: 404 }
    )
  }

  const session = await startSession(user.id, puzzleId, difficulty)
  return successResponse(toSafeSession(session), 201)
})

export const GET = withAuth(async (req, user) => {
  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "10"), 50)
  const sessions = await getRecentSessions(user.id, limit)
  return successResponse({ sessions: sessions.map(toSafeSession), total: sessions.length })
})
