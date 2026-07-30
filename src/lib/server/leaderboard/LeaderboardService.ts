import { connectDB } from "@/lib/server/db";
import User from "@/lib/server/models/User";
import type { GameCompletion, LeaderboardEntryData, LeaderboardQuery, LeaderboardResult } from "@/lib/server/games/types";
import { leaderboardRepository } from "./LeaderboardRepository";

export class LeaderboardService {
  async recordEntry(event: GameCompletion): Promise<void> {
    await connectDB();
    const user = await User.findById(event.playerId).lean();
    if (!user) return;

    const entry: LeaderboardEntryData = {
      playerId: event.playerId,
      username: user.username || "Unknown",
      gameType: event.gameType,
      puzzleId: event.puzzleId,
      difficulty: event.difficulty,
      score: event.score,
      time: event.elapsedTime,
      hintsUsed: event.hintsUsed,
      mistakes: event.mistakes,
      completedAt: event.completedAt,
      isGuest: event.isGuest,
      isReplay: event.isReplay,
    };

    await leaderboardRepository.writeEntry(entry);
  }

  async getLeaderboard(query: LeaderboardQuery): Promise<LeaderboardResult> {
    return leaderboardRepository.queryTop(query);
  }

  async getPlayerRank(
    playerId: string,
    gameType: string,
    difficulty?: string
  ): Promise<{ rank: number; total: number } | null> {
    return leaderboardRepository.getPlayerRank(playerId, gameType, difficulty);
  }

  async getPlayerHistory(
    playerId: string,
    gameType: string,
    limit?: number
  ): Promise<LeaderboardEntryData[]> {
    return leaderboardRepository.getPlayerEntries(playerId, gameType, limit);
  }
}

export const leaderboardService = new LeaderboardService();
