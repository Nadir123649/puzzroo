import { connectDB } from "@/lib/server/db";
import SudokuPuzzle from "@/lib/server/models/SudokuPuzzle";
import PlaySession from "@/lib/server/models/sudoku/PlaySession";
import DailyChallenge from "@/lib/server/models/sudoku/DailyChallenge";
import type { Difficulty } from "./types";

function todayString(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dateToSeed(date: string): number {
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    const char = date.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export async function getPuzzleById(id: string) {
  await connectDB();
  const doc = await SudokuPuzzle.findOne({ puzzleId: id }).lean();
  if (!doc) return null;
  return doc;
}

export async function getPuzzlesByDifficulty(difficulty: Difficulty, cursor?: string, limit = 20) {
  await connectDB();
  const filter: any = { difficulty };
  if (cursor) filter._id = { $lt: cursor };
  const docs = await SudokuPuzzle.find(filter)
    .sort({ _id: -1 })
    .limit(limit)
    .lean();
  return docs;
}

export async function getRandomPuzzle(
  userId?: string,
  difficulty?: Difficulty,
  excludeIds?: string[],
  guestId?: string
) {
  await connectDB();

  const diff = difficulty || "medium";
  const exclusions = new Set(excludeIds || []);
  const ownerField = guestId ? "guestId" : (userId ? "userId" : undefined);

  if (ownerField) {
    const ownerValue = guestId || userId!;
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [activeSessions, completedSessions, recentAbandoned] = await Promise.all([
      PlaySession.find({
        [ownerField]: ownerValue,
        status: { $in: ["playing", "paused"] },
      }).select("puzzleId").lean(),
      PlaySession.find({
        [ownerField]: ownerValue,
        status: "completed",
      }).select("puzzleId").lean(),
      PlaySession.find({
        [ownerField]: ownerValue,
        status: "abandoned",
        updatedAt: { $gte: twentyFourHoursAgo },
      }).select("puzzleId").lean(),
    ]);

    for (const s of activeSessions) exclusions.add(String(s.puzzleId));
    for (const s of completedSessions) exclusions.add(String(s.puzzleId));
    for (const s of recentAbandoned) exclusions.add(String(s.puzzleId));
  }

  const todayId = await getDailyPuzzleId(todayString());
  if (todayId) exclusions.add(todayId);

  const match: any = { difficulty: diff };
  if (exclusions.size > 0) {
    match.puzzleId = { $nin: Array.from(exclusions) };
  }

  const [doc] = await SudokuPuzzle.aggregate([
    { $match: match },
    { $sample: { size: 1 } },
  ]);

  if (doc) return doc;

  delete match._id;
  const [fallback] = await SudokuPuzzle.aggregate([
    { $match: match },
    { $sample: { size: 1 } },
  ]);

  return fallback || null;
}

async function getDailyPuzzleId(date: string): Promise<string | null> {
  if (dailyPuzzleIdCache.date === date) return dailyPuzzleIdCache.id;
  const dc = await DailyChallenge.findOne({ date }).lean();
  const id = dc ? String(dc.puzzleId) : null;
  dailyPuzzleIdCache = { date, id };
  return id;
}

let dailyPuzzleIdCache: { date: string; id: string | null } = { date: "", id: null };

export async function getDailyPuzzle(date?: string) {
  await connectDB();
  const targetDate = date || todayString();
  const seed = dateToSeed(targetDate);

  let dc = await DailyChallenge.findOne({ date: targetDate }).lean();

  if (!dc) {
    const difficulties = ["easy", "medium", "hard", "expert"] as const;
    const diffIdx = seed % difficulties.length;
    const difficulty = difficulties[diffIdx];

    const count = await SudokuPuzzle.countDocuments({ difficulty });
    if (count === 0) return null;

    const dailyIndex = seed % count;
    const puzzle = await SudokuPuzzle.findOne({ difficulty, dailyIndex }).lean();
    if (!puzzle) return null;

    dc = await DailyChallenge.create({
      date: targetDate,
      puzzleId: puzzle._id,
      difficulty,
    });
  }

  const puzzle = await SudokuPuzzle.findById(dc.puzzleId).lean();
  if (!puzzle) return null;

  return { puzzle, dailyChallenge: dc };
}

export async function getCatalogSummary() {
  await connectDB();
  const difficulties = ["easy", "medium", "hard", "expert"] as const;
  const byDifficulty: Record<string, number> = {};

  for (const diff of difficulties) {
    byDifficulty[diff] = await SudokuPuzzle.countDocuments({ difficulty: diff });
  }

  return {
    game: "sudoku",
    total: Object.values(byDifficulty).reduce((a, b) => a + b, 0),
    byDifficulty,
  };
}
