import { NextRequest } from "next/server"
import { withAuth } from "../../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/crossmath/services/SessionService"
import { verificationEngine } from "@/lib/server/puzzles/crossmath/services/VerificationEngine"
import { statisticsService } from "@/lib/server/puzzles/crossmath/services/StatisticsService"
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

  const result = await sessionService.completeSession(sessionId, user.id, parsed.data.grid)

  if (!result.completed) {
    return successResponse({
      completed: false,
      message: "Puzzle is not complete.",
      verifyResult: {
        correct: result.verifyResult.correct,
        accuracy: result.verifyResult.accuracy,
        mistakes: result.verifyResult.mistakes,
        errors: result.verifyResult.errors,
      },
    })
  }

  await statisticsService.updateOnSessionComplete(
    user.id,
    result.session.puzzleId,
    result.session.difficulty,
    result.session.elapsedTime,
    result.session.hintsUsed,
    result.session.mistakes,
    result.verifyResult.accuracy
  )

  return successResponse({
    completed: true,
    sessionId: result.session.sessionId,
    accuracy: result.verifyResult.accuracy,
    elapsedTime: result.session.elapsedTime,
    mistakes: result.session.mistakes,
    completedAt: result.session.completedAt,
  })
})
