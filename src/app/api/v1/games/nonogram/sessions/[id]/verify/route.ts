import { NextRequest } from "next/server"
import { withAuth } from "../../../route-helpers"
import { verificationEngine } from "@/lib/server/puzzles/nonogram/services/VerificationEngine"
import { verifyGridSchema } from "@/lib/server/puzzles/nonogram/validators"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { sessionService } from "@/lib/server/puzzles/nonogram/services/SessionService"

export const POST = withAuth(async (req, user, params) => {
  let body: any = {}
  try { body = await req.json() } catch {}

  const val = verifyGridSchema.safeParse(body)
  if (!val.success) {
    return errorResponse(400, "validation_error", val.error.issues[0].message)
  }

  const session = await sessionService.getSession(params.id, user.id)
  const result = await verificationEngine.verifyCompletion(session.puzzleId, val.data.grid)

  return successResponse({
    isComplete: result.isComplete,
    accuracy: result.accuracy,
    totalCellsRequired: result.totalCellsRequired,
    correctCells: result.correctCells,
    incorrectCells: result.incorrectCells,
    mistakes: result.mistakes,
    rowValidation: result.rowValidation,
    columnValidation: result.columnValidation,
  })
})
