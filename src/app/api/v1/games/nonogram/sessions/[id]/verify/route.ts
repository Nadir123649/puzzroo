import { NextRequest } from "next/server"
import { withAuth } from "../../../route-helpers"
import type { Actor } from "../../../route-helpers"
import { verificationEngine } from "@/lib/server/puzzles/nonogram/services/VerificationEngine"
import { verifyGridSchema } from "@/lib/server/puzzles/nonogram/validators"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { sessionService } from "@/lib/server/puzzles/nonogram/services/SessionService"
import { rateLimit } from "@/lib/server/utils/http"

export const POST = withAuth(async (req: NextRequest, actor: Actor, params: any) => {
  if (!rateLimit(req, "nonogram-verify", 60)) {
    return errorResponse(429, "rate_limited", "Too many requests")
  }
  let body: any = {}
  try { body = await req.json() } catch {}

  const val = verifyGridSchema.safeParse(body)
  if (!val.success) {
    return errorResponse(400, "validation_error", val.error.issues[0].message)
  }

  const session = await sessionService.getSession(params.id, actor)
  if (session.sessionStatus !== "playing") throw new Error("session_not_active")
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
