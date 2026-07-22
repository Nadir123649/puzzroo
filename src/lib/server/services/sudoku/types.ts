export type SessionStatus = "playing" | "paused" | "completed" | "abandoned";
export type SessionResult = "incomplete" | "solved" | "gave_up";
export type Difficulty = "easy" | "medium" | "hard" | "expert";

export interface MistakeRecord {
  cell: string;
  expected: number;
  received: number;
  timestamp: Date;
}

export interface MoveRecord {
  cell: string;
  from: number;
  to: number;
  timestamp: Date;
}

export interface BestTimeRecord {
  time: number;
  puzzleId: string;
  difficulty: Difficulty;
}

export interface CreateSessionInput {
  puzzleId: string;
  difficulty?: Difficulty;
}

export interface SaveProgressInput {
  board: string;
  notes?: string[][];
  elapsedTime: number;
}

export interface VerifyCompletionInput {
  board: string;
}

export interface CompleteSessionInput {
  board: string;
  elapsedTime: number;
}

export interface DailyCompletionRecord {
  date: string;
  completed: boolean;
  time: number;
  score: number;
  hintsUsed: number;
  mistakes: number;
}

export interface UserStatsResponse {
  gamesPlayed: number;
  gamesCompleted: number;
  gamesAbandoned: number;
  totalPlayTime: number;
  averageSolveTime: number;
  bestTime: BestTimeRecord | null;
  currentStreak: number;
  longestStreak: number;
  favoriteDifficulty: Difficulty | null;
  totalHintsUsed: number;
  totalMistakes: number;
  totalScore: number;
  highestScore: number;
}

export interface SessionResponse {
  id: string;
  puzzleId: string;
  difficulty: Difficulty;
  status: SessionStatus;
  currentBoard: string;
  initialBoard: string;
  notes: string[][];
  elapsedTime: number;
  hintsUsed: number;
  mistakes: MistakeRecord[];
  result: SessionResult;
  score: number;
  restartCount: number;
  startedAt: string;
  pausedAt: string | null;
  lastSavedAt: string;
}
