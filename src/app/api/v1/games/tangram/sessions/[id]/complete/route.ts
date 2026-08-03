import { NextRequest } from "next/server"
import { withAuth } from "../../../route-helpers"
import type { Actor } from "../../../route-helpers"
import { sessionService } from "@/lib/server/puzzles/tangram/services/SessionService"
import { statisticsService } from "@/lib/server/puzzles/tangram/services/StatisticsService"
import { completeSessionSchema } from "@/lib/server/puzzles/tangram/validators"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { rateLimit } from "@/lib/server/utils/http"
import { completionBus } from "@/lib/server/games/completion"
import { ensureGameSubscriptions } from "@/lib/server/games/subscriptions"
import DailyChallenge from "@/lib/server/models/DailyChallenge"
import TangramPlaySession from "@/lib/server/models/TangramPlaySession"

export const POST = withAuth(async (req: NextRequest, actor: Actor, params: any) => {
  if (!rateLimit(req, "tangram-complete", 30)) {
    return errorResponse(429, "rate_limited", "Too many requests")
  }

  let body: any = {}
  try { body = await req.json() } catch {}

  const parsed = completeSessionSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(400, "validation_error", parsed.error.issues[0].message)
  }

  const { pieceStates, elapsedTime, hintsUsed, mistakes, moves } = parsed.data

  const sessionResult = await sessionService.completeSession(
    params.id, actor, pieceStates, elapsedTime, hintsUsed, mistakes, moves || 0
  )

  if (sessionResult.isCompleted && sessionResult.result) {
    const sessionDoc = await TangramPlaySession.findOne({ sessionId: params.id }).lean()

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
      gameType: "tangram",
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

    // Daily Challenge bookkeeping is strictly scoped: only sessions created via
    // the daily challenge flow may touch the (date, userId)-unique row. A plain
    // tangram completion must never mark today's challenge as done.
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
