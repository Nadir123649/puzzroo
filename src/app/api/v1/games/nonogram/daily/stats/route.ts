import { NextRequest } from "next/server"
import { withAuth } from "../../route-helpers"
import type { Actor } from "../../route-helpers"
import DailyChallenge from "@/lib/server/models/DailyChallenge"
import NonogramPlaySession from "@/lib/server/models/NonogramPlaySession"
import { successResponse } from "@/lib/server/utils/apiResponse"

export const GET = withAuth(async (_req: NextRequest, actor: Actor) => {
  if (actor.type === "guest") {
    const filter = { guestId: actor.id, gameType: "daily_challenge" }
    const sessions = await NonogramPlaySession.find(filter).lean()
    const completed = sessions.filter((s: any) => s.status === "completed")

    let bestTime = 0
    let bestTimeDate: string | null = null
    for (const s of completed as any[]) {
      if (bestTime === 0 || (s.elapsedTime || 0) < bestTime) {
        bestTime = s.elapsedTime || 0
        bestTimeDate = s.completedAt?.toISOString?.().split("T")[0] || null
      }
    }

    return successResponse({
      totalChallenges: sessions.length,
      completedChallenges: completed.length,
      completionRate: sessions.length > 0 ? Math.round((completed.length / sessions.length) * 100) : 0,
      currentStreak: calculateSessionStreak(completed, false),
      longestStreak: calculateSessionStreak(completed, true),
      bestTime,
      bestTimeDate,
    })
  }

  const [totalChallenges, completedChallenges, currentStreak, longestStreak] = await Promise.all([
    DailyChallenge.countDocuments({ userId: actor.id }),
    DailyChallenge.countDocuments({ userId: actor.id, status: "completed" }),
    calculateDailyStreak(actor.id, false),
    calculateDailyStreak(actor.id, true),
  ])

  const bestResult = await DailyChallenge.findOne({
    userId: actor.id,
    status: "completed",
  })
    .sort({ elapsedSeconds: 1 })
    .lean()

  return successResponse({
    totalChallenges,
    completedChallenges,
    completionRate: totalChallenges > 0 ? Math.round((completedChallenges / totalChallenges) * 100) : 0,
    currentStreak,
    longestStreak,
    bestTime: (bestResult as any)?.elapsedSeconds || 0,
    bestTimeDate: (bestResult as any)?.date || null,
  })
})

function calculateSessionStreak(sessions: any[], longest: boolean): number {
  if (sessions.length === 0) return 0
  const dates = sessions
    .filter((s) => s.completedAt)
    .map((s) => new Date(s.completedAt).toISOString().split("T")[0])
    .sort()
    .reverse()

  const unique = Array.from(new Set(dates))
  if (unique.length === 0) return 0

  if (longest) {
    let max = 1
    let cur = 1
    for (let i = 1; i < unique.length; i++) {
      const prev = new Date(unique[i - 1])
      const curr = new Date(unique[i])
      const diff = Math.round((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24))
      if (diff === 1) {
        cur++
        max = Math.max(max, cur)
      } else {
        cur = 1
      }
    }
    return max
  }

  let streak = 1
  for (let i = 1; i < unique.length; i++) {
    const prev = new Date(unique[i - 1])
    const curr = new Date(unique[i])
    const diff = Math.round((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 1) {
      streak++
    } else {
      break
    }
  }
  return streak
}

async function calculateDailyStreak(userId: string, longest: boolean): Promise<number> {
  const challenges = await DailyChallenge.find({
    userId,
    status: "completed",
  })
    .sort({ date: -1 })
    .lean()

  if (challenges.length === 0) return 0

  if (longest) {
    let maxStreak = 1
    let currentRun = 1

    for (let i = 1; i < challenges.length; i++) {
      const prev = new Date(challenges[i - 1].date)
      const curr = new Date(challenges[i].date)
      const diffDays = Math.round(
        (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24)
      )
      if (diffDays === 1) {
        currentRun++
        maxStreak = Math.max(maxStreak, currentRun)
      } else {
        currentRun = 1
      }
    }

    return maxStreak
  }

  let streak = 1
  for (let i = 1; i < challenges.length; i++) {
    const prev = new Date(challenges[i - 1].date)
    const curr = new Date(challenges[i].date)
    const diffDays = Math.round(
      (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24)
    )
    if (diffDays === 1) {
      streak++
    } else {
      break
    }
  }

  return streak
}
