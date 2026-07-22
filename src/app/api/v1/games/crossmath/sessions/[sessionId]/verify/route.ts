import { NextRequest } from "next/server"
import { withAuth } from "../../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/crossmath/services/SessionService"
import { verifyGridSchema } from "@/lib/server/puzzles/crossmath/validators"
import { successResponse } from "@/lib/server/utils/apiResponse"

export const POST = withAuth(async (req, user, params) => {
  const { sessionId } = params
  const body = await req.json()
  const parsed = verifyGridSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { success: false, payload: { error: { code: "validation_error", message: parsed.error.issues[0].message } }, timestamp: Date.now() },
      { status: 400 }
    )
  }

  const result = await sessionService.verifyGrid(sessionId, user.id, parsed.data.grid)
  return successResponse({
    correct: result.correct,
    completed: result.completed,
    mistakes: result.mistakes,
    maxMistakes: result.maxMistakes,
    accuracy: result.accuracy,
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
