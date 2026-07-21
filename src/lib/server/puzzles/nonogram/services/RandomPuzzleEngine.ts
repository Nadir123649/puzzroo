import NonogramPuzzle from "@/lib/server/models/NonogramPuzzle";
import PlaySession from "@/lib/server/models/PlaySession";
import DailyChallenge from "@/lib/server/models/DailyChallenge";
import type { Difficulty } from "../types";

interface SelectRandomOptions {
  userId: string;
  difficulty?: Difficulty;
  excludeCompleted?: boolean;
  excludeActive?: boolean;
  excludeRecentAbandons?: boolean;
  excludeDaily?: boolean;
}

export class RandomPuzzleEngine {
  async selectRandom(options: SelectRandomOptions) {
    const {
      userId,
      difficulty,
      excludeCompleted = true,
      excludeActive = true,
      excludeRecentAbandons = true,
      excludeDaily = true,
    } = options;

    const matchFilter: any = { game: "nonogram", isActive: true };
    if (difficulty) {
      matchFilter.difficulty = difficulty;
    }

    const excludeIds: string[] = [];

    if (excludeCompleted) {
      const completed = await PlaySession.find({
        userId,
        status: "completed",
      }).distinct("puzzleId");
      excludeIds.push(...completed.map((id) => id.toString()));
    }

    if (excludeActive) {
      const active = await PlaySession.find({
        userId,
        status: { $in: ["active", "paused"] },
      }).distinct("puzzleId");
      excludeIds.push(...active.map((id) => id.toString()));
    }

    if (excludeRecentAbandons) {
      const twentyFourHoursAgo = new Date(
        Date.now() - 24 * 60 * 60 * 1000
      );
      const recentAbandons = await PlaySession.find({
        userId,
        status: "abandoned",
        updatedAt: { $gte: twentyFourHoursAgo },
      }).distinct("puzzleId");
      excludeIds.push(...recentAbandons.map((id) => id.toString()));
    }

    if (excludeDaily) {
      const today = new Date();
      const dateStr = today.toISOString().split("T")[0];
      const dailyPuzzle = await DailyChallenge.findOne({ date: dateStr });
      if (dailyPuzzle) {
        excludeIds.push(dailyPuzzle.puzzleId);
      } else {
        const dayOfYear = Math.floor(
          (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
            86400000
        );
        const allPuzzles = await NonogramPuzzle.find({
          game: "nonogram",
          ...(difficulty ? { difficulty } : {}),
        })
          .sort({ dailyIndex: 1 })
          .lean();
        if (allPuzzles.length > 0) {
          const dailyIndex = dayOfYear % allPuzzles.length;
          excludeIds.push(allPuzzles[dailyIndex].puzzleId);
        }
      }
    }

    if (excludeIds.length > 0) {
      matchFilter.puzzleId = { $nin: [...new Set(excludeIds)] };
    }

    const pipeline: any[] = [
      { $match: matchFilter },
      { $sample: { size: 1 } },
    ];

    const results = await NonogramPuzzle.aggregate(pipeline);

    if (results.length === 0) {
      const fallbackMatch: any = { game: "nonogram", isActive: true };
      if (difficulty) {
        fallbackMatch.difficulty = difficulty;
      }
      const fallback = await NonogramPuzzle.aggregate([
        { $match: fallbackMatch },
        { $sample: { size: 1 } },
      ]);
      if (fallback.length === 0) {
        throw new Error("no_puzzles_available");
      }
      return fallback[0];
    }

    return results[0];
  }

  async selectDailyPuzzle(userId: string, difficulty?: Difficulty) {
    const today = new Date();
    const dateStr = today.toISOString().split("T")[0];

    const existing = await DailyChallenge.findOne({
      date: dateStr,
      userId,
    });

    if (existing) {
      const puzzle = await NonogramPuzzle.findOne({
        puzzleId: existing.puzzleId,
      }).lean();
      if (puzzle) {
        return { puzzle, dailyChallenge: existing };
      }
    }

    const matchFilter: any = { game: "nonogram", isActive: true };
    if (difficulty) {
      matchFilter.difficulty = difficulty;
    }

    const dayOfYear = Math.floor(
      (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
        86400000
    );

    const allPuzzles = await NonogramPuzzle.find(matchFilter)
      .sort({ dailyIndex: 1 })
      .lean();

    if (allPuzzles.length === 0) {
      throw new Error("no_daily_puzzles_available");
    }

    const puzzleIndex = dayOfYear % allPuzzles.length;
    return { puzzle: allPuzzles[puzzleIndex], dailyChallenge: null };
  }
}

export const randomPuzzleEngine = new RandomPuzzleEngine();
