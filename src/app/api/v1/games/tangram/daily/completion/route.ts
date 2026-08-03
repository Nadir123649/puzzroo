import { NextRequest } from "next/server"
import { withAuth } from "../../route-helpers"
import type { Actor } from "../../route-helpers"
import TangramPlaySession from "@/lib/server/models/TangramPlaySession"
import { successResponse, errorResponse } from "@/lib/server/utils/apiResponse"
import { rateLimit } from "@/lib/server/utils/http"

function dailyChallengeIdFromDate(dateStr: string): string {
  const parts = dateStr.split("-")
  if (parts.length === 3) {
    const [y, m, d] = parts
    return `daily-tangram-${m.padStart(2, "0")}-${d.padStart(2, "0")}-${y.slice(-2)}`
  }
  const d = new Date(dateStr)
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  const y = String(d.getFullYear()).slice(-2)
  return `daily-tangram-${m}-${day}-${y}`
}

export const GET = withAuth(async (req: NextRequest, actor: Actor) => {
  if (!rateLimit(req, "tangram-daily-completion", 30)) {
    return errorResponse(429, "rate_limited", "Too many requests")
  }

  const url = new URL(req.url)
  const dateParam = url.searchParams.get("date")
  const today = dateParam || new Date().toISOString().split("T")[0]
  const challengeId = dailyChallengeIdFromDate(today)

  try {
    const filter: Record<string, unknown> = {
      dailyChallengeId: challengeId,
      gameType: "daily_challenge",
      status: "completed",
    }
    if (actor.type === "guest") {
      filter.guestId = actor.id
    } else {
      filter.userId = actor.id
    }

    const session = await TangramPlaySession.findOne(filter)
      .sort({ completedAt: -1 })
      .lean()

    if (!session) {
      return successResponse({ completed: false, date: today })
    }

    const s = session as any
    return successResponse({
      completed: true,
      date: today,
      elapsedSeconds: s.elapsedTime || 0,
      hintsUsed: s.hintsUsed || 0,
      mistakes: s.mistakes || 0,
      score: s.result?.score || 0,
      accuracy: s.result?.accuracy || 0,
    })
  } catch (error: any) {
    console.error("[tangram/daily/completion]", error)
    return errorResponse(500, "internal_error", "Internal Server Error")
  }
})
