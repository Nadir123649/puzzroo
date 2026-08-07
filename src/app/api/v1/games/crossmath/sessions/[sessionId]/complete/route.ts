import { NextRequest } from "next/server"
import { withAuth } from "../../../route-helpers"
import type { Actor } from "../../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/crossmath/services/SessionService"
import { statisticsService } from "@/lib/server/puzzles/crossmath/services/StatisticsService"
import { completeSessionSchema } from "@/lib/server/puzzles/crossmath/validators"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { rateLimit } from "@/lib/server/utils/http"
import { completionBus } from "@/lib/server/games/completion"
import { recordGameCompletion } from "@/lib/server/games/recordCompletion"
import { ensureGameSubscriptions } from "@/lib/server/games/subscriptions"
import DailyChallenge from "@/lib/server/models/DailyChallenge"

export const POST = withAuth(async (req: NextRequest, actor: Actor, params) => {
  if (!rateLimit(req, "crossmath-complete", 15)) {
    return errorResponse(429, "rate_limited", "Too many requests")
  }
  const { sessionId } = params
  const body = await req.json()
  const parsed = completeSessionSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { success: false, version: "1.0.0", payload: { error: { code: "validation_error", message: parsed.error.issues[0].message } }, serverTimestamp: new Date().toISOString() },
      { status: 400 }
    )
  }

  const result = await sessionService.completeSession(
    sessionId,
    actor,
    parsed.data.grid,
    parsed.data.elapsedTime,
    parsed.data.hintsUsed,
    parsed.data.mistakes,
    parsed.data.moves
  )

  if (result.isCompleted && result.result) {
    if (actor.type === "user") {
      statisticsService.updateOnSessionComplete(
        actor.id,
        result.result.puzzleId,
        result.result.difficulty,
        result.result.elapsedTime,
        result.result.hintsUsed,
        result.result.mistakes,
        result.result.accuracy
      ).catch(() => {})

      try {
        await recordGameCompletion({
          userId: actor.id,
          gameId: "crossmath",
          puzzleId: result.result.puzzleId,
          difficulty: result.result.difficulty,
          time: result.result.elapsedTime,
          hintsUsed: result.result.hintsUsed,
          mistakes: result.result.mistakes,
          score: result.result.score,
        })
      } catch (err) {
        console.error("[crossmath] recordGameCompletion failed:", err)
      }

      ensureGameSubscriptions()
      completionBus.emit({
        playerId: actor.id,
        sessionId,
        gameType: "crossmath",
        puzzleId: result.result.puzzleId,
        difficulty: result.result.difficulty,
        score: result.result.score,
        elapsedTime: result.result.elapsedTime,
        mistakes: result.result.mistakes,
        hintsUsed: result.result.hintsUsed,
        completedAt: new Date(),
        isReplay: false,
        isGuest: false,
      })

      const today = new Date().toISOString().split("T")[0]
      DailyChallenge.findOneAndUpdate(
        { gameId: "crossmath", date: today, userId: actor.id },
        {
          gameId: "crossmath",
          date: today,
          userId: actor.id,
          puzzleId: result.result.puzzleId,
          difficulty: result.result.difficulty,
          sessionId,
          status: "completed",
          completedAt: new Date(),
          elapsedSeconds: result.result.elapsedTime,
          accuracy: result.result.accuracy,
          hintsUsed: result.result.hintsUsed,
          mistakes: result.result.mistakes,
        },
        { upsert: true, returnDocument: 'after' }
      ).catch(() => {})
    }
  }

  return successResponse(result)
})
