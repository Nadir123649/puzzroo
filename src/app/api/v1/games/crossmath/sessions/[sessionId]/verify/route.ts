import { NextRequest } from "next/server"
import { withAuth } from "../../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/crossmath/services/SessionService"
import { verifyGridSchema } from "@/lib/server/puzzles/crossmath/validators"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { rateLimit } from "@/lib/server/utils/http"

export const POST = withAuth(async (req, user, params) => {
  if (!rateLimit(req, "crossmath-verify", 60)) {
    return errorResponse(429, "rate_limited", "Too many requests")
  }
  const { sessionId } = params
  const body = await req.json()
  const parsed = verifyGridSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { success: false, version: "1.0.0", payload: { error: { code: "validation_error", message: parsed.error.issues[0].message } }, serverTimestamp: new Date().toISOString() },
      { status: 400 }
    )
  }

  const result = await sessionService.verifyGrid(sessionId, user.id, parsed.data.grid)
  return successResponse({
    isCorrect: result.isCorrect,
    completed: result.completed,
    mistakes: result.mistakes,
    maxMistakes: result.maxMistakes,
    accuracy: result.accuracy,
    totalEquations: result.totalEquations,
    correctEquations: result.correctEquations,
    incorrectEquations: result.incorrectEquations,
    equations: result.equations.map(eq => ({
      equationId: eq.equationId,
      direction: eq.direction,
      correct: eq.correct,
      expectedResult: eq.expectedResult,
      actualResult: eq.actualResult,
    })),
    errors: result.errors,
  })
})
