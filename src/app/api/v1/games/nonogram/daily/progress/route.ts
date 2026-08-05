import { NextRequest } from "next/server"
import { withAuth } from "../../route-helpers"
import type { Actor } from "../../route-helpers"
import DailyChallenge from "@/lib/server/models/DailyChallenge"
import NonogramPlaySession from "@/lib/server/models/NonogramPlaySession"
import { successResponse } from "@/lib/server/utils/apiResponse"

function dailyChallengeIdFromDate(dateStr: string): string {
  const parts = dateStr.split("-")
  if (parts.length === 3) {
    const [y, m, d] = parts
    return `daily-nonogram-${m.padStart(2, "0")}-${d.padStart(2, "0")}-${y.slice(-2)}`
  }
  const d = new Date(dateStr)
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  const y = String(d.getFullYear()).slice(-2)
  return `daily-nonogram-${m}-${day}-${y}`
}

export const GET = withAuth(async (req: NextRequest, actor: Actor) => {
  const today = new Date().toISOString().split("T")[0]

  if (actor.type === "guest") {
    const session = await NonogramPlaySession.findOne({
      guestId: actor.id,
      gameType: "daily_challenge",
      dailyChallengeId: dailyChallengeIdFromDate(today),
    })
      .sort({ createdAt: -1 })
      .lean()

    if (!session) {
      return successResponse({
        hasProgress: false,
        message: "No daily challenge progress yet. Fetch today's puzzle first.",
      })
    }

    const s = session as any
    return successResponse({
      hasProgress: true,
      date: s.dailyChallengeId?.replace("daily-nonogram-", "") || today,
      puzzleId: s.puzzleId,
      difficulty: s.difficulty,
      status: s.status,
      elapsedSeconds: s.elapsedTime || 0,
      hintsUsed: s.hintsUsed || 0,
      mistakes: s.mistakes || 0,
      accuracy: s.result?.accuracy || 0,
      completedAt: s.completedAt,
    })
  }

  const challenge = await DailyChallenge.findOne({
    date: today,
    userId: actor.id,
  }).lean()

  if (!challenge) {
    return successResponse({
      hasProgress: false,
      message: "No daily challenge progress yet. Fetch today's puzzle first.",
    })
  }

  return successResponse({
    hasProgress: true,
    date: challenge.date,
    puzzleId: challenge.puzzleId,
    difficulty: challenge.difficulty,
    status: challenge.status,
    elapsedSeconds: challenge.elapsedSeconds,
    hintsUsed: challenge.hintsUsed,
    mistakes: challenge.mistakes,
    accuracy: challenge.accuracy,
    completedAt: challenge.completedAt,
  })
})
