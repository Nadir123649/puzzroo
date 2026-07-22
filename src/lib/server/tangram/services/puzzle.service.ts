import TangramPuzzle from '../../models/TangramPuzzle';
import PlaySession from '../../models/PlaySession';
import GameProgress from '../../models/GameProgress';
import type { PuzzleQuery } from '../types';

export async function getRandomPuzzle(
  userId: string | null,
  query: PuzzleQuery = {}
) {
  const match: Record<string, unknown> = {
    game: 'tangram',
    active: true,
    status: 'active',
  };

  if (query.difficulty) {
    match.difficulty = query.difficulty;
  }

  if (query.category) {
    match['metadata.category'] = query.category;
  }

  if (userId) {
    const excludeIds: string[] = [];

    if (query.excludeCompleted !== false) {
      const completed = await GameProgress.find({
        userId,
        gameId: 'tangram',
        completed: true,
      }).select('puzzleId').lean();
      excludeIds.push(...completed.map((p) => p.puzzleId));
    }

    if (query.excludeAbandoned !== false) {
      const abandoned = await PlaySession.find({
        userId,
        gameId: 'tangram',
        status: 'abandoned',
        updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      }).select('puzzleId').lean();
      excludeIds.push(...abandoned.map((s) => s.puzzleId));
    }

    if (query.excludeActive !== false) {
      const active = await PlaySession.find({
        userId,
        gameId: 'tangram',
        status: 'active',
      }).select('puzzleId').lean();
      excludeIds.push(...active.map((s) => s.puzzleId));
    }

    if (excludeIds.length > 0) {
      match.puzzleId = { $nin: [...new Set(excludeIds)] };
    }
  }

  const [puzzle] = await TangramPuzzle.aggregate([
    { $match: match },
    { $sample: { size: 1 } },
  ]);

  if (!puzzle) {
    const fallbackMatch: Record<string, unknown> = {
      game: 'tangram',
      active: true,
      status: 'active',
    };
    if (query.difficulty) fallbackMatch.difficulty = query.difficulty;
    const [fallback] = await TangramPuzzle.aggregate([
      { $match: fallbackMatch },
      { $sample: { size: 1 } },
    ]);
    return fallback || null;
  }

  return puzzle;
}

export async function getPuzzleById(puzzleId: string) {
  return TangramPuzzle.findOne({ puzzleId, active: true, status: 'active' })
    .lean();
}

export async function getPuzzleCounts() {
  const counts = await TangramPuzzle.aggregate([
    { $match: { active: true, status: 'active' } },
    {
      $group: {
        _id: '$difficulty',
        count: { $sum: 1 },
      },
    },
  ]);
  return counts.reduce(
    (acc, c) => {
      acc[c._id] = c.count;
      return acc;
    },
    {} as Record<string, number>
  );
}
