import { NextRequest } from "next/server"
import { withAuth } from "../../../route-helpers"
import type { Actor } from "../../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/nonogram/services/SessionService"
import { statisticsService } from "@/lib/server/puzzles/nonogram/services/StatisticsService"
import { completeSessionSchema } from "@/lib/server/puzzles/nonogram/validators"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { rateLimit } from "@/lib/server/utils/http"
import { completionBus } from "@/lib/server/games/completion"
import { ensureGameSubscriptions } from "@/lib/server/games/subscriptions"
import DailyChallenge from "@/lib/server/models/DailyChallenge"
import NonogramPlaySession from "@/lib/server/models/NonogramPlaySession"

export const POST = withAuth(async (req: NextRequest, actor: Actor, params: any) => {
  if (!rateLimit(req, "nonogram-complete", 30)) {
    return errorResponse(429, "rate_limited", "Too many requests")
  }

  let body: any = {}
  try { body = await req.json() } catch {}

  const val = completeSessionSchema.safeParse(body)
  if (!val.success) {
    return errorResponse(400, "validation_error", val.error.issues[0].message)
  }

  const { grid, elapsedTime, hintsUsed, mistakes, moves } = val.data

  const sessionResult = await sessionService.completeSession(
    params.id, actor, grid, elapsedTime, hintsUsed, mistakes, moves
  )

  if (sessionResult.isCompleted && sessionResult.result) {
    const sessionDoc = await NonogramPlaySession.findOne({ sessionId: params.id }).lean()

    if (actor.type === "user") {
      statisticsService.updateOnSessionComplete(
        actor.id,
        sessionResult.result.puzzleId,
        sessionResult.result.difficulty,
        sessionResult.result.elapsedTime,
        sessionResult.result.hintsUsed,
        sessionResult.result.mistakes,
        sessionResult.result.accuracy
      ).catch(() => {})
    }

    ensureGameSubscriptions()
    completionBus.emit({
      playerId: actor.id,
      sessionId: params.id,
      gameType: "nonogram",
      puzzleId: sessionResult.result.puzzleId,
      difficulty: sessionResult.result.difficulty,
      score: sessionResult.result.score,
      elapsedTime: sessionResult.result.elapsedTime,
      mistakes: sessionResult.result.mistakes,
      hintsUsed: sessionResult.result.hintsUsed,
      completedAt: new Date(),
      isReplay: (sessionDoc as any)?.isReplay || false,
      isGuest: actor.type === "guest",
    })

    if (
      actor.type === "user" &&
      (sessionDoc as any)?.gameType === "daily_challenge" &&
      (sessionDoc as any)?.dailyChallengeId
    ) {
      const today = new Date().toISOString().split("T")[0]
      DailyChallenge.findOneAndUpdate(
        { date: today, userId: actor.id },
        {
          $set: {
            date: today,
            userId: actor.id,
            puzzleId: sessionResult.result.puzzleId,
            difficulty: sessionResult.result.difficulty,
            sessionId: params.id,
            status: "completed",
            completedAt: new Date(),
            elapsedSeconds: sessionResult.result.elapsedTime,
            accuracy: sessionResult.result.accuracy,
            hintsUsed: sessionResult.result.hintsUsed,
            mistakes: sessionResult.result.mistakes,
          },
          $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true, new: true }
      ).catch(() => {})
    }
  }

  return successResponse(sessionResult)
})
