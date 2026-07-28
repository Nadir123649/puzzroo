import { NextRequest } from "next/server"
import { withAuth } from "../../../route-helpers"
import { verificationEngine } from "@/lib/server/puzzles/tangram/services/VerificationEngine"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { sessionService } from "@/lib/server/puzzles/tangram/services/SessionService"

export const POST = withAuth(async (req, user, params) => {
  let body: any = {}
  try { body = await req.json() } catch {}

  const { grid, pieces } = body

  const session = await sessionService.getSession(params.id, user.id)
  const result = await verificationEngine.verifyCompletion(session.puzzleId, grid, pieces)

  return successResponse({
    isComplete: result.isComplete,
    accuracy: result.accuracy,
    totalCellsRequired: result.totalCellsRequired,
    correctCells: result.correctCells,
    incorrectCells: result.incorrectCells,
    mistakes: result.mistakes,
    pieces: result.pieces,
    rowValidation: result.rowValidation,
    columnValidation: result.columnValidation,
  })
})