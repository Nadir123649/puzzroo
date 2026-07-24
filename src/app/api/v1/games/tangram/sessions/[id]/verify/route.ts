import { NextRequest } from "next/server"
import { withAuth } from "../../../route-helpers"
import PlaySession from "@/lib/server/models/PlaySession"
import TangramPuzzle from "@/lib/server/models/TangramPuzzle"
import { successResponse } from "@/lib/server/utils/apiResponse"
import { validatePuzzle } from "@shared/lib/tangram/polygon-validation"

export const POST = withAuth(async (req, user, params) => {
  const { id } = params
  const body = await req.json()
  const { pieceStates } = body

  const session = await PlaySession.findOne({ _id: id, userId: user.id })
  if (!session) {
    return Response.json(
      { success: false, payload: { error: { code: "session_not_found", message: "Session not found." } }, timestamp: Date.now() },
      { status: 404 }
    )
  }

  const puzzle = await TangramPuzzle.findOne({ puzzleId: session.puzzleId }).lean()
  if (!puzzle) {
    return Response.json(
      { success: false, payload: { error: { code: "puzzle_not_found", message: "Puzzle not found." } }, timestamp: Date.now() },
      { status: 404 }
    )
  }

  const states = pieceStates || session.pieceStates
  const currentPolygons = states.map((p: any) => {
    const piece = (puzzle as any).individualPiecePolygons[(puzzle as any).pieceShapeIds.indexOf(p.pieceId)]
    if (!piece) return []
    const rad = (p.rotation || 0) * Math.PI / 180
    const cos = Math.cos(rad), sin = Math.sin(rad)
    return piece.map(([x, y]: number[]) => [
      x * cos - y * sin + (p.position?.x || 0),
      x * sin + y * cos + (p.position?.y || 0),
    ])
  })
  const targetPolygons = (puzzle as any).individualPiecePolygons || []
  const pieceIds = (puzzle as any).pieceShapeIds || []

  const validation = validatePuzzle(pieceIds, currentPolygons, targetPolygons)

  return successResponse({
    isSolved: validation.isSolved,
    correctCount: validation.correctCount,
    totalCount: validation.totalCount,
    pieces: validation.pieces,
  })
})
