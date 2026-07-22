import { connectDB } from "@/lib/server/db";
import PlaySession from "@/lib/server/models/sudoku/PlaySession";
import DailyChallenge from "@/lib/server/models/sudoku/DailyChallenge";
import UserStatistics from "@/lib/server/models/sudoku/UserStatistics";
import type { DailyCompletionRecord } from "./types";

function todayString(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function getOrCreateDailyChallenge(date?: string) {
  await connectDB();
  const targetDate = date || todayString();
  return DailyChallenge.findOne({ date: targetDate }).lean();
}

export async function recordDailyPlay(userId: string, date?: string) {
  await connectDB();
  const targetDate = date || todayString();
  await DailyChallenge.findOneAndUpdate(
    { date: targetDate },
    { $inc: { playerCount: 1 } }
  );
}

export async function recordDailyCompletion(userId: string, date?: string) {
  await connectDB();
  const targetDate = date || todayString();
  await DailyChallenge.findOneAndUpdate(
    { date: targetDate },
    { $inc: { completionCount: 1 } }
  );

  await UserStatistics.findOneAndUpdate(
    { userId },
    { $inc: { currentStreak: 1 } }
  );
}

export async function getUserDailyHistory(userId: string): Promise<DailyCompletionRecord[]> {
  await connectDB();
  const sessions = await PlaySession.find({
    userId,
    puzzleId: { $ne: null },
  })
    .sort({ completedAt: -1 })
    .limit(30)
    .lean();

  const dailyChallenges = await DailyChallenge.find({
    puzzleId: { $in: sessions.map(s => s.puzzleId) },
  }).lean();

  const dcMap = new Map(dailyChallenges.map(dc => [String(dc.puzzleId), dc.date]));

  return sessions
    .filter(s => dcMap.has(String(s.puzzleId)))
    .map(s => ({
      date: dcMap.get(String(s.puzzleId)) || "",
      completed: s.status === "completed",
      time: s.elapsedTime || 0,
      score: s.score || 0,
      hintsUsed: s.hintsUsed || 0,
      mistakes: s.mistakes?.length || 0,
    }));
}

export async function isDailyPuzzle(puzzleId: string): Promise<boolean> {
  await connectDB();
  const count = await DailyChallenge.countDocuments({ puzzleId });
  return count > 0;
}
