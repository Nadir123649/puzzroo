import { NextRequest } from "next/server"
import { withAuth } from "../../route-helpers"
import type { Actor } from "../../route-helpers"
import DailyChallenge from "@/lib/server/models/DailyChallenge"
import NonogramPlaySession from "@/lib/server/models/NonogramPlaySession"
import { successResponse } from "@/lib/server/utils/apiResponse"

export const GET = withAuth(async (req: NextRequest, actor: Actor) => {
  const url = new URL(req.url)
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "30"), 365)
  const skip = parseInt(url.searchParams.get("skip") || "0")

  if (actor.type === "guest") {
    const filter = { guestId: actor.id, gameType: "daily_challenge" }
    const [sessions, total] = await Promise.all([
      NonogramPlaySession.find(filter)
        .sort({ completedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      NonogramPlaySession.countDocuments(filter),
    ])

    const results = sessions.map((s: any) => ({
      date: s.dailyChallengeId?.replace("daily-nonogram-", "") || s.createdAt?.toISOString?.().split("T")[0],
      puzzleId: s.puzzleId,
      difficulty: s.difficulty,
      status: s.status,
      elapsedSeconds: s.elapsedTime || 0,
      hintsUsed: s.hintsUsed || 0,
      mistakes: s.mistakes || 0,
      accuracy: s.result?.accuracy || 0,
      completedAt: s.completedAt,
    }))

    return successResponse({ challenges: results, total, limit, skip })
  }

  const [challenges, total] = await Promise.all([
    DailyChallenge.find({ userId: actor.id })
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    DailyChallenge.countDocuments({ userId: actor.id }),
  ])

  const results = challenges.map((c: any) => ({
    date: c.date,
    puzzleId: c.puzzleId,
    difficulty: c.difficulty,
    status: c.status,
    elapsedSeconds: c.elapsedSeconds,
    hintsUsed: c.hintsUsed,
    mistakes: c.mistakes,
    accuracy: c.accuracy,
    completedAt: c.completedAt,
  }))

  return successResponse({ challenges: results, total, limit, skip })
})
