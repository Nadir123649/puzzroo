export type SessionStatus = "playing" | "paused" | "completed" | "abandoned";
export type SessionResult = "incomplete" | "solved" | "gave_up";
export type Difficulty = "easy" | "medium" | "hard" | "expert";

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
  hintsUsed?: number;
  mistakes?: number;
  moves?: number;
}

export interface VerifyCompletionInput {
  board: string;
}

export interface CompleteSessionInput {
  board: string;
  elapsedTime: number;
  hintsUsed?: number;
  mistakes?: number;
  moves?: number;
  score?: number;
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
  notes: string[][] | null;
  elapsedTime: number;
  hintsUsed: number;
  mistakes: number;
  moves: number;
  result: SessionResult;
  score: number;
  restartCount: number;
  startedAt: string;
  pausedAt: string | null;
  lastSavedAt: string;
  isReplay?: boolean;
}

export interface SudokuPuzzleInfo {
  puzzleId: string;
  difficulty: string;
  puzzle: string;
  solution: string;
}

export interface ContinuePlayingResponse {
  hasActiveSession: boolean;
  session?: SessionResponse & { puzzle: SudokuPuzzleInfo };
}

export interface ReplayResponse {
  session: SessionResponse;
  puzzle: SudokuPuzzleInfo;
}
