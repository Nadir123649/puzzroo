import { connectDB } from "@/lib/server/db";
import LeaderboardEntry from "./LeaderboardEntry";
import type { LeaderboardEntryData, LeaderboardQuery, LeaderboardResult } from "@/lib/server/games/types";

export class LeaderboardRepository {
  async writeEntry(data: LeaderboardEntryData): Promise<void> {
    await connectDB();
    await LeaderboardEntry.create({
      playerId: data.playerId,
      username: data.username,
      gameType: data.gameType,
      puzzleId: data.puzzleId,
      difficulty: data.difficulty,
      score: data.score,
      time: data.time,
      hintsUsed: data.hintsUsed,
      mistakes: data.mistakes,
      completedAt: data.completedAt,
      isGuest: data.isGuest,
      isReplay: data.isReplay,
    });
  }

  async queryTop(query: LeaderboardQuery): Promise<LeaderboardResult> {
    await connectDB();
    const filter: Record<string, unknown> = { gameType: query.gameType };
    if (query.difficulty) filter.difficulty = query.difficulty;

    const limit = Math.min(query.limit ?? 50, 100);
    const offset = query.offset ?? 0;

    const [entries, total] = await Promise.all([
      LeaderboardEntry.find(filter)
        .sort({ score: -1, time: 1 })
        .skip(offset)
        .limit(limit)
        .lean(),
      LeaderboardEntry.countDocuments(filter),
    ]);

    const mapped = entries.map((e) => ({
      playerId: String(e.playerId),
      username: e.username,
      gameType: e.gameType,
      puzzleId: e.puzzleId,
      difficulty: e.difficulty,
      score: e.score,
      time: e.time,
      hintsUsed: e.hintsUsed,
      mistakes: e.mistakes,
      completedAt: e.completedAt,
      isGuest: e.isGuest,
      isReplay: e.isReplay,
    }));

    return {
      entries: mapped,
      total,
      hasMore: offset + limit < total,
    };
  }

  async getPlayerRank(
    playerId: string,
    gameType: string,
    difficulty?: string
  ): Promise<{ rank: number; total: number } | null> {
    await connectDB();
    const filter: Record<string, unknown> = { gameType };
    if (difficulty) filter.difficulty = difficulty;

    const bestScore = await LeaderboardEntry.findOne({
      playerId,
      ...filter,
    })
      .sort({ score: -1 })
      .lean();

    if (!bestScore) return null;

    const rankFilter: Record<string, unknown> = { ...filter };
    rankFilter.$or = [
      { score: { $gt: bestScore.score } },
      { score: bestScore.score, time: { $lt: bestScore.time } },
    ];

    const rank = await LeaderboardEntry.countDocuments(rankFilter);
    const total = await LeaderboardEntry.countDocuments(filter);

    return { rank: rank + 1, total };
  }

  async getPlayerEntries(
    playerId: string,
    gameType: string,
    limit = 20
  ): Promise<LeaderboardEntryData[]> {
    await connectDB();
    const entries = await LeaderboardEntry.find({ playerId, gameType })
      .sort({ completedAt: -1 })
      .limit(limit)
      .lean();

    return entries.map((e) => ({
      playerId: String(e.playerId),
      username: e.username,
      gameType: e.gameType,
      puzzleId: e.puzzleId,
      difficulty: e.difficulty,
      score: e.score,
      time: e.time,
      hintsUsed: e.hintsUsed,
      mistakes: e.mistakes,
      completedAt: e.completedAt,
      isGuest: e.isGuest,
      isReplay: e.isReplay,
    }));
  }
}

export const leaderboardRepository = new LeaderboardRepository();
