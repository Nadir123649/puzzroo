import { connectDB } from "@/lib/server/db";
import GameProgress from "@/lib/server/models/GameProgress";
import type { LeaderboardEntryData, LeaderboardQuery, LeaderboardResult } from "@/lib/server/games/types";

export class GameProgressAdapter {
  async queryTop(query: LeaderboardQuery): Promise<LeaderboardResult> {
    await connectDB();
    const filter: Record<string, unknown> = {
      gameId: query.gameType,
      completed: true,
    };
    if (query.difficulty) filter.difficulty = query.difficulty;

    const limit = Math.min(query.limit ?? 50, 100);
    const offset = query.offset ?? 0;

    const [entries, total] = await Promise.all([
      GameProgress.find(filter)
        .sort({ score: -1, time: 1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      GameProgress.countDocuments(filter),
    ]);

    const mapped: LeaderboardEntryData[] = entries.map((e) => ({
      playerId: String(e.userId),
      username: "Player",
      gameType: e.gameId,
      puzzleId: e.puzzleId,
      difficulty: e.difficulty,
      score: e.score,
      time: e.time || e.bestTime,
      hintsUsed: e.hintsUsed,
      mistakes: e.mistakes,
      completedAt: e.completedAt ?? new Date(),
      isGuest: false,
      isReplay: false,
    }));

    return {
      entries: mapped,
      total,
      hasMore: offset + limit < total,
    };
  }
}

export const gameProgressAdapter = new GameProgressAdapter();
