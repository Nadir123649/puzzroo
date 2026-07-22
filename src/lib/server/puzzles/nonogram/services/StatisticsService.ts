import UserStatistics from "@/lib/server/models/UserStatistics";
import PuzzleStatistics from "@/lib/server/models/PuzzleStatistics";
import PlaySession from "@/lib/server/models/PlaySession";
import type { Difficulty, UserGameStats } from "../types";

export class StatisticsService {
  async ensureUserStats(userId: string) {
    let stats = await UserStatistics.findOne({ userId });
    if (!stats) {
      stats = await UserStatistics.create({ userId });
    }
    return stats;
  }

  async updateOnSessionComplete(
    userId: string,
    puzzleId: string,
    difficulty: string,
    elapsedSeconds: number,
    hintsUsed: number,
    mistakes: number,
    accuracy: number
  ) {
    await this.updateUserStats(userId, difficulty, elapsedSeconds, hintsUsed, mistakes, accuracy, true);
    await this.updatePuzzleStats(puzzleId, elapsedSeconds, accuracy, true);
  }

  async updateOnSessionAbandon(userId: string, puzzleId: string, difficulty: string) {
    await this.updateUserStats(userId, difficulty, 0, 0, 0, 0, false);
    await this.updatePuzzleStats(puzzleId, 0, 0, false);
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
    const stats = await this.ensureUserStats(userId);

    stats.totalPlayed++;
    stats.totalTime += elapsedSeconds;
    stats.totalHintsUsed += hintsUsed;
    stats.totalMistakes += mistakes;

    if (completed) {
      stats.totalCompleted++;
      stats.lastCompletedAt = new Date();

      if (stats.bestTime === 0 || elapsedSeconds < stats.bestTime) {
        stats.bestTime = elapsedSeconds;
      }

      const diff = stats.perDifficulty as any;
      if (diff[difficulty]) {
        diff[difficulty].played++;
        diff[difficulty].completed++;
        if (diff[difficulty].bestTime === 0 || elapsedSeconds < diff[difficulty].bestTime) {
          diff[difficulty].bestTime = elapsedSeconds;
        }
      }
    } else {
      stats.totalAbandoned++;
    }

    stats.lastPlayedAt = new Date();
    stats.averageTime = Math.round(stats.totalTime / stats.totalPlayed);
    stats.averageAccuracy = stats.totalCompleted > 0
      ? Math.round(
          ((stats.averageAccuracy * (stats.totalCompleted - 1)) + accuracy) /
            stats.totalCompleted
        )
      : accuracy;

    const completedSessions = await PlaySession.find({
      userId,
      status: "completed",
    })
      .sort({ completedAt: -1 })
      .lean();

    stats.currentStreak = this.calculateCurrentStreak(completedSessions);
    stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);

    const diffEntries = Object.entries(stats.perDifficulty as any) as Array<
      [string, { completed: number }]
    >;
    const maxCompleted = diffEntries.reduce(
      (max, [key, val]) => (val.completed > (max?.count || 0) ? { key, count: val.completed } : max),
      null as { key: string; count: number } | null
    );
    stats.favoriteDifficulty = maxCompleted && maxCompleted.count > 0 ? maxCompleted.key : null;

    await stats.save();
  }

  private calculateCurrentStreak(
    sessions: Array<{ completedAt?: Date | null }>
  ): number {
    if (sessions.length === 0) return 0;

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < sessions.length; i++) {
      if (!sessions[i].completedAt) continue;
      const compDate = new Date(sessions[i].completedAt!);
      compDate.setHours(0, 0, 0, 0);

      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - streak);

      const diffTime = Math.abs(compDate.getTime() - expectedDate.getTime());
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        streak++;
      } else if (diffDays === 1) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }

  private async updatePuzzleStats(
    puzzleId: string,
    elapsedSeconds: number,
    accuracy: number,
    completed: boolean
  ) {
    let stats = await PuzzleStatistics.findOne({ puzzleId });
    if (!stats) {
      const puzzle = await (
        await import("@/lib/server/models/NonogramPuzzle")
      ).default.findOne({ puzzleId }).lean() as any;
      if (!puzzle) return;
      stats = await PuzzleStatistics.create({
        puzzleId,
        difficulty: puzzle.difficulty,
        size: puzzle.size,
      });
    }

    stats.totalAttempts++;

    if (completed) {
      stats.totalCompletions++;

      if (stats.bestTime === 0 || elapsedSeconds < stats.bestTime) {
        stats.bestTime = elapsedSeconds;
      }
    } else {
      stats.totalAbandons++;
    }

    stats.averageTime = stats.totalCompletions > 0
      ? Math.round(
          ((stats.averageTime * (stats.totalCompletions - 1)) + elapsedSeconds) /
            stats.totalCompletions
        )
      : elapsedSeconds;

    stats.averageAccuracy = stats.totalCompletions > 0
      ? Math.round(
          ((stats.averageAccuracy * (stats.totalCompletions - 1)) + accuracy) /
            stats.totalCompletions
        )
      : accuracy;

    stats.completionRate = stats.totalAttempts > 0
      ? Math.round((stats.totalCompletions / stats.totalAttempts) * 100) / 100
      : 0;

    await stats.save();
  }

  async getUserStats(userId: string): Promise<UserGameStats> {
    const stats = await this.ensureUserStats(userId);
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
      perDifficulty: stats.perDifficulty as any,
    };
  }

  async getPuzzleStats(puzzleId: string) {
    return PuzzleStatistics.findOne({ puzzleId }).lean();
  }
}

export const statisticsService = new StatisticsService();
