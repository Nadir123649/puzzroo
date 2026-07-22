import DailyChallenge from '../../models/DailyChallenge';
import TangramPuzzle from '../../models/TangramPuzzle';

function dateToSeed(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return y * 10000 + m * 100 + d;
}

function todayString(): string {
  const dt = new Date();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${dt.getFullYear()}-${m}-${day}`;
}

const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

export async function getDailyPuzzle(userId: string | null, date?: string) {
  const dateStr = date || todayString();
  const seed = dateToSeed(dateStr);

  const difficulty = DIFFICULTIES[seed % DIFFICULTIES.length];

  const count = await TangramPuzzle.countDocuments({
    game: 'tangram',
    active: true,
    status: 'active',
    dailyEligible: true,
    difficulty,
  });

  if (count === 0) return null;

  const dailyIndex = seed % count;
  const puzzle = await TangramPuzzle.findOne({
    game: 'tangram',
    active: true,
    status: 'active',
    dailyEligible: true,
    difficulty,
    dailyIndex,
  }).lean();

  if (!puzzle) return null;

  let dailyStatus = null;
  if (userId) {
    const challenge = await DailyChallenge.findOne({
      date: dateStr,
      userId,
    }).lean();

    if (challenge) {
      dailyStatus = {
        completed: challenge.status === 'completed',
        elapsedSeconds: challenge.elapsedSeconds,
        accuracy: challenge.accuracy,
      };
    }
  }

  return { puzzle: { ...puzzle }, dailyStatus };
}

export async function updateDailyChallenge(
  userId: string,
  puzzleId: string,
  difficulty: string,
  sessionId: string,
  elapsedSeconds: number,
  accuracy: number,
  hintsUsed: number,
  mistakes: number
) {
  const dateStr = todayString();

  return DailyChallenge.findOneAndUpdate(
    { date: dateStr, userId },
    {
      date: dateStr,
      userId,
      puzzleId,
      difficulty,
      sessionId,
      status: 'completed',
      completedAt: new Date(),
      elapsedSeconds,
      accuracy,
      hintsUsed,
      mistakes,
    },
    { upsert: true, new: true }
  );
}

export async function getDailyHistory(userId: string) {
  return DailyChallenge.find({ userId })
    .sort({ date: -1 })
    .limit(30)
    .select('date puzzleId difficulty elapsedSeconds accuracy hintsUsed mistakes status')
    .lean();
}

export async function getDailyCompletionStatus(userId: string, date?: string) {
  const dateStr = date || todayString();
  return DailyChallenge.findOne({ date: dateStr, userId }).lean();
}
