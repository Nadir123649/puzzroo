import { connectDB } from "@/lib/server/db";
import PlaySession from "@/lib/server/models/sudoku/PlaySession";
import UserStatistics from "@/lib/server/models/sudoku/UserStatistics";
import PuzzleStatistics from "@/lib/server/models/sudoku/PuzzleStatistics";
import DailyChallenge from "@/lib/server/models/sudoku/DailyChallenge";
import type { Difficulty, UserStatsResponse } from "./types";

function computeStreaks(dates: Date[]): { current: number; longest: number } {
  if (dates.length === 0) return { current: 0, longest: 0 };

  const uniqueDays = [...new Set(dates.map(d => {
    const date = new Date(d);
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
  }))].sort().reverse();

  let current = 0;
  const today = new Date();
  const todayStr = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}-${String(today.getUTCDate()).padStart(2, "0")}`;

  if (uniqueDays[0] === todayStr || uniqueDays[0] === getYesterdayStr()) {
    current = 1;
    for (let i = 1; i < uniqueDays.length; i++) {
      const prev = new Date(uniqueDays[i - 1]);
      const curr = new Date(uniqueDays[i]);
      const diffDays = Math.round((prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        current++;
      } else {
        break;
      }
    }
  }

  let longest = 1;
  let temp = 1;
  const sortedAsc = [...uniqueDays].reverse();
  for (let i = 1; i < sortedAsc.length; i++) {
    const prev = new Date(sortedAsc[i - 1]);
    const curr = new Date(sortedAsc[i]);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      temp++;
      longest = Math.max(longest, temp);
    } else {
      temp = 1;
    }
  }
  longest = Math.max(longest, temp);

  return { current, longest };
}

function getYesterdayStr(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function findFavoriteDifficulty(sessions: any[]): Difficulty | null {
  const counts: Record<string, number> = {};
  for (const s of sessions) {
    const diff = s.difficulty || "medium";
    counts[diff] = (counts[diff] || 0) + 1;
  }
  let maxCount = 0;
  let fav: string | null = null;
  for (const [diff, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      fav = diff;
    }
  }
  return fav as Difficulty | null;
}

export async function getUserStats(userId: string): Promise<UserStatsResponse | null> {
  await connectDB();

  let stats = await UserStatistics.findOne({ userId }).lean();
  if (stats) {
    return {
      gamesPlayed: stats.gamesPlayed,
      gamesCompleted: stats.gamesCompleted,
      gamesAbandoned: stats.gamesAbandoned,
      totalPlayTime: stats.totalPlayTime,
      averageSolveTime: stats.averageSolveTime,
      bestTime: stats.bestTime?.time ? stats.bestTime as any : null,
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      favoriteDifficulty: stats.favoriteDifficulty as Difficulty | null,
      totalHintsUsed: stats.totalHintsUsed,
      totalMistakes: stats.totalMistakes,
      totalScore: stats.totalScore,
      highestScore: stats.highestScore,
    };
  }

  const allSessions = await PlaySession.find({ userId }).lean();
  if (allSessions.length === 0) return null;

  const completed = allSessions.filter(s => s.status === "completed");
  const abandoned = allSessions.filter(s => s.status === "abandoned");
  const totalTime = allSessions.reduce((sum, s) => sum + (s.elapsedTime || 0), 0);
  const totalScore = completed.reduce((sum, s) => sum + (s.score || 0), 0);
  const highestScore = completed.reduce((max, s) => Math.max(max, s.score || 0), 0);
  const totalHints = completed.reduce((sum, s) => sum + (s.hintsUsed || 0), 0);
  const totalMistakes = completed.reduce((sum, s) => sum + (s.mistakes?.length || 0), 0);
  const avgTime = completed.length > 0
    ? Math.round(completed.reduce((sum, s) => sum + (s.elapsedTime || 0), 0) / completed.length)
    : 0;

  let bestTime: { time: number; puzzleId: string; difficulty: Difficulty } | null = null;
  for (const s of completed) {
    if (!bestTime || (s.elapsedTime || 0) < bestTime.time) {
      bestTime = {
        time: s.elapsedTime || 0,
        puzzleId: String(s.puzzleId),
        difficulty: (s.difficulty || "medium") as Difficulty,
      };
    }
  }

  const completedDates = completed
    .filter(s => s.completedAt)
    .map(s => new Date(s.completedAt!));

  const streaks = computeStreaks(completedDates);
  const fav = findFavoriteDifficulty(allSessions);

  return {
    gamesPlayed: allSessions.length,
    gamesCompleted: completed.length,
    gamesAbandoned: abandoned.length,
    totalPlayTime: totalTime,
    averageSolveTime: avgTime,
    bestTime,
    currentStreak: streaks.current,
    longestStreak: streaks.longest,
    favoriteDifficulty: fav,
    totalHintsUsed: totalHints,
    totalMistakes: totalMistakes,
    totalScore,
    highestScore,
  };
}

export async function updateUserStatsOnComplete(sessionId: string, userId: string) {
  await connectDB();
  const session = await PlaySession.findOne({ _id: sessionId, userId }).lean();
  if (!session) return;

  const stats = await UserStatistics.findOne({ userId });
  const data = {
    gamesPlayed: 1,
    gamesCompleted: 1,
    totalPlayTime: session.elapsedTime || 0,
    totalScore: session.score || 0,
    totalHintsUsed: session.hintsUsed || 0,
    totalMistakes: session.mistakes?.length || 0,
    lastPlayedAt: new Date(),
  };

  if (!stats) {
    const allSessions = await PlaySession.find({ userId }).lean();
    const fav = findFavoriteDifficulty(allSessions);

    await UserStatistics.create({
      userId,
      gamesPlayed: allSessions.length,
      gamesCompleted: allSessions.filter(s => s.status === "completed").length,
      gamesAbandoned: allSessions.filter(s => s.status === "abandoned").length,
      totalPlayTime: data.totalPlayTime,
      averageSolveTime: data.totalPlayTime,
      totalScore: data.totalScore,
      highestScore: data.totalScore,
      totalHintsUsed: data.totalHintsUsed,
      totalMistakes: data.totalMistakes,
      favoriteDifficulty: fav,
      lastPlayedAt: data.lastPlayedAt,
    });
    return;
  }

  stats.gamesPlayed += data.gamesPlayed;
  stats.gamesCompleted += data.gamesCompleted;
  stats.totalPlayTime += data.totalPlayTime;
  stats.totalScore += data.totalScore;
  stats.totalHintsUsed += data.totalHintsUsed;
  stats.totalMistakes += data.totalMistakes;

  if ((session.score || 0) > stats.highestScore) {
    stats.highestScore = session.score || 0;
  }

  if ((session.elapsedTime || 0) < (stats.bestTime?.time || Infinity)) {
    stats.bestTime = {
      time: session.elapsedTime || 0,
      puzzleId: String(session.puzzleId),
      difficulty: session.difficulty || "medium",
    };
  }

  const completed = await PlaySession.find({ userId, status: "completed" })
    .select("completedAt").lean();
  const completedDates = completed
    .filter(s => s.completedAt)
    .map(s => new Date(s.completedAt!));
  const streaks = computeStreaks(completedDates);
  stats.currentStreak = streaks.current;
  stats.longestStreak = Math.max(streaks.longest, stats.longestStreak);

  const allSessions = await PlaySession.find({ userId }).lean();
  stats.favoriteDifficulty = findFavoriteDifficulty(allSessions);
  stats.lastPlayedAt = new Date();

  const completedTime = completed
    .filter(s => s.status === "completed")
    .reduce((sum, s) => sum + (s.elapsedTime || 0), 0);
  stats.averageSolveTime = stats.gamesCompleted > 0
    ? Math.round(completedTime / stats.gamesCompleted)
    : 0;

  await stats.save();
}

export async function updateUserStatsOnAbandon(sessionId: string, userId: string) {
  await connectDB();
  const session = await PlaySession.findOne({ _id: sessionId, userId }).lean();
  if (!session) return;

  const stats = await UserStatistics.findOne({ userId });
  if (stats) {
    stats.gamesAbandoned += 1;
    stats.lastPlayedAt = new Date();
    await stats.save();
  } else {
    await UserStatistics.create({
      userId,
      gamesPlayed: 1,
      gamesAbandoned: 1,
      lastPlayedAt: new Date(),
    });
  }
}

export async function updatePuzzleStatsOnComplete(sessionId: string) {
  await connectDB();
  const session = await PlaySession.findById(sessionId).lean();
  if (!session) return;

  let stats = await PuzzleStatistics.findOne({ puzzleId: session.puzzleId });

  if (!stats) {
    await PuzzleStatistics.create({
      puzzleId: session.puzzleId,
      totalPlays: 1,
      totalCompletions: 1,
      averageSolveTime: session.elapsedTime || 0,
      averageMistakes: session.mistakes?.length || 0,
      averageHints: session.hintsUsed || 0,
      fastestSolve: {
        time: session.elapsedTime || 0,
        userId: session.userId,
      },
      completionsByDifficulty: [{ difficulty: session.difficulty || "medium", count: 1 }],
      lastPlayedAt: new Date(),
    });
    return;
  }

  stats.totalPlays += 1;
  stats.totalCompletions += 1;
  stats.lastPlayedAt = new Date();

  const prevAvg = stats.averageSolveTime;
  const prevCount = stats.totalCompletions - 1;
  stats.averageSolveTime = prevCount > 0
    ? Math.round((prevAvg * prevCount + (session.elapsedTime || 0)) / stats.totalCompletions)
    : (session.elapsedTime || 0);

  const prevAvgMistakes = stats.averageMistakes;
  stats.averageMistakes = prevCount > 0
    ? Math.round(((prevAvgMistakes * prevCount) + (session.mistakes?.length || 0)) / stats.totalCompletions * 10) / 10
    : (session.mistakes?.length || 0);

  const prevAvgHints = stats.averageHints;
  stats.averageHints = prevCount > 0
    ? Math.round(((prevAvgHints * prevCount) + (session.hintsUsed || 0)) / stats.totalCompletions * 10) / 10
    : (session.hintsUsed || 0);

  if ((session.elapsedTime || 0) < (stats.fastestSolve?.time || Infinity)) {
    stats.fastestSolve = {
      time: session.elapsedTime || 0,
      userId: session.userId,
    };
  }

  const diffEntry = stats.completionsByDifficulty?.find(
    (d: any) => d.difficulty === session.difficulty
  );
  if (diffEntry) {
    diffEntry.count += 1;
  } else {
    stats.completionsByDifficulty = stats.completionsByDifficulty || [];
    stats.completionsByDifficulty.push({
      difficulty: session.difficulty || "medium",
      count: 1,
    });
  }

  await stats.save();
}
