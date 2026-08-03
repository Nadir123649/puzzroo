import mongoose from "mongoose"
import UserStatistics from "@/lib/server/models/UserStatistics"
import PuzzleStatistics from "@/lib/server/models/PuzzleStatistics"
import TangramPlaySession from "@/lib/server/models/TangramPlaySession"
import type { Actor } from "@/app/api/v1/games/tangram/route-helpers"

export class StatisticsService {
  async ensureUserStats(userId: string) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return null
    }
    let stats = await UserStatistics.findOne({ userId, gameId: "tangram" })
    if (!stats) {
      stats = await UserStatistics.create({
        userId,
        gameId: "tangram",
      })
    }
    return stats
  }

  async updateOnSessionComplete(
    actorIdOrUserId: string,
    puzzleId: string,
    difficulty: string,
    elapsedSeconds: number,
    hintsUsed: number,
    mistakes: number,
    accuracy: number,
    isGuest = false
  ) {
    if (!isGuest && mongoose.Types.ObjectId.isValid(actorIdOrUserId)) {
      await this.updateUserStats(actorIdOrUserId, difficulty, elapsedSeconds, hintsUsed, mistakes, accuracy, true)
    }
    await this.updatePuzzleStats(puzzleId, elapsedSeconds, accuracy, true)
  }

  async updateOnSessionAbandon(
    actorIdOrUserId: string,
    puzzleId: string,
    difficulty: string,
    isGuest = false
  ) {
    if (!isGuest && mongoose.Types.ObjectId.isValid(actorIdOrUserId)) {
      await this.updateUserStats(actorIdOrUserId, difficulty, 0, 0, 0, 0, false)
    }
    await this.updatePuzzleStats(puzzleId, 0, 0, false)
  }

  private async updateUserStats(
    userId: string,
    difficulty: string,
    elapsedSeconds: number,
    hintsUsed: number,
    mistakes: number,
    accuracy: number,
    completed: boolean
  ) {
    const stats = await this.ensureUserStats(userId)
    if (!stats) return

    stats.totalPlayed++
    stats.totalTime += elapsedSeconds
    stats.totalHintsUsed += hintsUsed
    stats.totalMistakes += mistakes

    if (completed) {
      stats.totalCompleted++
      stats.lastCompletedAt = new Date()

      if (stats.bestTime === 0 || elapsedSeconds < stats.bestTime) {
        stats.bestTime = elapsedSeconds
      }

      const diff = stats.perDifficulty as any
      if (diff && diff[difficulty]) {
        diff[difficulty].played++
        diff[difficulty].completed++
        if (diff[difficulty].bestTime === 0 || elapsedSeconds < diff[difficulty].bestTime) {
          diff[difficulty].bestTime = elapsedSeconds
        }
      }
    } else {
      stats.totalAbandoned++
    }

    stats.lastPlayedAt = new Date()
    stats.averageTime = stats.totalPlayed > 0
      ? Math.round(stats.totalTime / stats.totalPlayed)
      : 0
    stats.averageAccuracy = stats.totalCompleted > 0
      ? Math.round(
          ((stats.averageAccuracy * (stats.totalCompleted - 1)) + accuracy) /
            stats.totalCompleted
        )
      : accuracy

    const completedSessions = await TangramPlaySession.find({
      userId,
      status: "completed",
    })
      .sort({ completedAt: -1 })
      .lean()

    stats.currentStreak = this.calculateCurrentStreak(completedSessions)
    stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak)

    const diffEntries = Object.entries(stats.perDifficulty as any || {}) as Array<
      [string, { completed: number }]
    >
    const maxCompleted = diffEntries.reduce(
      (max, [key, val]) =>
        val.completed > (max?.count || 0) ? { key, count: val.completed } : max,
      null as { key: string; count: number } | null
    )
    stats.favoriteDifficulty = maxCompleted && maxCompleted.count > 0 ? maxCompleted.key : null

    try {
      await stats.save()
    } catch (err) {
      console.error("[tangram] stats save failed", err)
    }
  }

  private calculateCurrentStreak(
    sessions: Array<{ completedAt?: Date | null }>
  ): number {
    if (sessions.length === 0) return 0

    let streak = 0
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    for (let i = 0; i < sessions.length; i++) {
      if (!sessions[i].completedAt) continue
      const compDate = new Date(sessions[i].completedAt!)
      compDate.setHours(0, 0, 0, 0)

      const expectedDate = new Date(today)
      expectedDate.setDate(expectedDate.getDate() - streak)

      const diffTime = Math.abs(compDate.getTime() - expectedDate.getTime())
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays === 0 || diffDays === 1) {
        streak++
      } else {
        break
      }
    }

    return streak
  }

  private async updatePuzzleStats(
    puzzleId: string,
    elapsedSeconds: number,
    accuracy: number,
    completed: boolean
  ) {
    let stats = await PuzzleStatistics.findOne({ puzzleId })
    if (!stats) {
      const puzzle = await (
        await import("@/lib/server/models/TangramPuzzle")
      ).default.findOne({ puzzleId }).lean() as any
      if (!puzzle) return
      stats = await PuzzleStatistics.create({
        puzzleId,
        difficulty: puzzle.difficulty,
        size: puzzle.metadata?.pieceCount || 7,
      })
    }

    stats.totalAttempts++

    if (completed) {
      stats.totalCompletions++
      if (stats.bestTime === 0 || elapsedSeconds < stats.bestTime) {
        stats.bestTime = elapsedSeconds
      }
    } else {
      stats.totalAbandons++
    }

    stats.averageTime = stats.totalCompletions > 0
      ? Math.round(
          ((stats.averageTime * (stats.totalCompletions - 1)) + elapsedSeconds) /
            stats.totalCompletions
        )
      : elapsedSeconds

    stats.averageAccuracy = stats.totalCompletions > 0
      ? Math.round(
          ((stats.averageAccuracy * (stats.totalCompletions - 1)) + accuracy) /
            stats.totalCompletions
        )
      : accuracy

    stats.completionRate = stats.totalAttempts > 0
      ? Math.round((stats.totalCompletions / stats.totalAttempts) * 100) / 100
      : 0

    try {
      await stats.save()
    } catch (err) {
      console.error("[tangram] puzzle stats save failed", err)
    }
  }

  async getUserStats(actorOrId: Actor | string) {
    const isGuest = typeof actorOrId === "object" ? actorOrId.type === "guest" : !mongoose.Types.ObjectId.isValid(actorOrId)
    const id = typeof actorOrId === "object" ? actorOrId.id : actorOrId

    if (isGuest) {
      const sessions = await TangramPlaySession.find({ guestId: id }).lean()
      return this.calculateStatsFromSessions(sessions)
    }

    const stats = await this.ensureUserStats(id)
    if (!stats) {
      const sessions = await TangramPlaySession.find({ userId: id }).lean()
      return this.calculateStatsFromSessions(sessions)
    }

    return {
      totalPlayed: stats.totalPlayed,
      totalCompleted: stats.totalCompleted,
      totalAbandoned: stats.totalAbandoned,
      totalTime: stats.totalTime,
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      bestTime: stats.bestTime,
      averageTime: stats.averageTime,
      averageAccuracy: stats.averageAccuracy,
      favoriteDifficulty: stats.favoriteDifficulty,
      perDifficulty: stats.perDifficulty,
    }
  }

  calculateStatsFromSessions(sessions: any[]) {
    const totalPlayed = sessions.length
    const completed = sessions.filter(s => s.status === "completed")
    const abandoned = sessions.filter(s => s.status === "abandoned")
    const totalCompleted = completed.length
    const totalAbandoned = abandoned.length

    const totalTime = sessions.reduce((sum, s) => sum + (s.elapsedTime || 0), 0)
    const averageTime = totalCompleted > 0
      ? Math.round(completed.reduce((sum, s) => sum + (s.elapsedTime || 0), 0) / totalCompleted)
      : 0

    const averageAccuracy = totalCompleted > 0
      ? Math.round(completed.reduce((sum, s) => sum + (s.result?.accuracy || 100), 0) / totalCompleted)
      : 0

    let bestTime = 0
    for (const s of completed) {
      if (bestTime === 0 || (s.elapsedTime || 0) < bestTime) {
        bestTime = s.elapsedTime || 0
      }
    }

    const completedSessions = completed.sort((a, b) => {
      const tA = a.completedAt ? new Date(a.completedAt).getTime() : 0
      const tB = b.completedAt ? new Date(b.completedAt).getTime() : 0
      return tB - tA
    })

    const currentStreak = this.calculateCurrentStreak(completedSessions)

    const perDifficulty = {
      easy: { played: 0, completed: 0, bestTime: 0, averageTime: 0 },
      medium: { played: 0, completed: 0, bestTime: 0, averageTime: 0 },
      hard: { played: 0, completed: 0, bestTime: 0, averageTime: 0 },
    }

    for (const s of sessions) {
      const diff = (s.difficulty || "medium") as keyof typeof perDifficulty
      if (perDifficulty[diff]) {
        perDifficulty[diff].played++
        if (s.status === "completed") {
          perDifficulty[diff].completed++
          if (perDifficulty[diff].bestTime === 0 || (s.elapsedTime || 0) < perDifficulty[diff].bestTime) {
            perDifficulty[diff].bestTime = s.elapsedTime || 0
          }
        }
      }
    }

    let favoriteDifficulty: string | null = null
    let maxDiffCompleted = 0
    for (const [diff, data] of Object.entries(perDifficulty)) {
      if (data.completed > maxDiffCompleted) {
        maxDiffCompleted = data.completed
        favoriteDifficulty = diff
      }
    }

    return {
      totalPlayed,
      totalCompleted,
      totalAbandoned,
      totalTime,
      currentStreak,
      longestStreak: currentStreak,
      bestTime,
      averageTime,
      averageAccuracy,
      favoriteDifficulty,
      perDifficulty,
    }
  }

  async getPuzzleStats(puzzleId: string) {
    return PuzzleStatistics.findOne({ puzzleId }).lean()
  }
}

export const statisticsService = new StatisticsService()
