import { NextRequest } from "next/server"
import { withAuth } from "../../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/tangram/services/SessionService"
import { statisticsService } from "@/lib/server/puzzles/tangram/services/StatisticsService"
import { completeSessionSchema } from "@/lib/server/puzzles/tangram/validators"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { rateLimit } from "@/lib/server/utils/http"
import { completionBus } from "@/lib/server/games/completion"
import { ensureGameSubscriptions } from "@/lib/server/games/subscriptions"
import DailyChallenge from "@/lib/server/models/DailyChallenge"

export const POST = withAuth(async (req, user, params) => {
  if (!rateLimit(req, "tangram-complete", 30)) {
    return errorResponse(429, "rate_limited", "Too many requests")
  }

  let body: any = {}
  try { body = await req.json() } catch {}

  const parsed = completeSessionSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(400, "validation_error", parsed.error.issues[0].message)
  }

  const { grid, pieces, elapsedTime, hintsUsed, mistakes, moves } = parsed.data

  const sessionResult = await sessionService.completeSession(
    params.id, user.id, grid, pieces, elapsedTime, hintsUsed, mistakes, moves
  )

  if (sessionResult.sessionStatus === "completed" && sessionResult.result) {
    statisticsService.updateOnSessionComplete(
      user.id,
      sessionResult.puzzleId,
      sessionResult.difficulty,
      sessionResult.result.elapsedTime,
      sessionResult.result.hintsUsed,
      sessionResult.result.mistakes,
      sessionResult.result.accuracy
    ).catch(() => {})

    ensureGameSubscriptions()
    completionBus.emit({
      playerId: user.id,
      sessionId: params.id,
      gameType: "tangram",
      puzzleId: sessionResult.puzzleId,
      difficulty: sessionResult.difficulty,
      score: sessionResult.result.score,
      elapsedTime: sessionResult.result.elapsedTime,
      mistakes: sessionResult.result.mistakes,
      hintsUsed: sessionResult.result.hintsUsed,
      completedAt: new Date(),
      isReplay: sessionResult.isReplay || false,
      isGuest: user.role === "guest",
    })

    const today = new Date().toISOString().split("T")[0]
    DailyChallenge.findOneAndUpdate(
      { date: today, userId: user.id },
      {
        date: today,
        userId: user.id,
        puzzleId: sessionResult.puzzleId,
        difficulty: sessionResult.difficulty,
        sessionId: params.id,
        status: "completed",
        completedAt: new Date(),
        elapsedSeconds: sessionResult.result.elapsedTime,
        accuracy: sessionResult.result.accuracy,
        hintsUsed: sessionResult.result.hintsUsed,
        mistakes: sessionResult.result.mistakes,
      },
      { upsert: true, new: true }
    ).catch(() => {})
  }

  return successResponse(sessionResult)
})
