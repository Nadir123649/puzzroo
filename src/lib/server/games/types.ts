export interface PlayerIdentity {
  playerId: string;
  isGuest: boolean;
}

export interface GameCompletion {
  playerId: string;
  sessionId: string;
  gameType: string;
  puzzleId: string;
  difficulty: string;
  score: number;
  elapsedTime: number;
  mistakes: number;
  hintsUsed: number;
  completedAt: Date;
  isReplay: boolean;
  isGuest: boolean;
}

export interface LeaderboardEntryData {
  playerId: string;
  username: string;
  gameType: string;
  puzzleId: string;
  difficulty: string;
  score: number;
  time: number;
  hintsUsed: number;
  mistakes: number;
  completedAt: Date;
  isGuest: boolean;
  isReplay: boolean;
}

export interface GameSessionSummary {
  sessionId: string;
  puzzleId: string;
  gameType: string;
  difficulty: string;
  status: string;
  score: number;
  elapsedTime: number;
}

export interface LeaderboardQuery {
  gameType: string;
  difficulty?: string;
  limit?: number;
  offset?: number;
}

export interface LeaderboardResult {
  entries: LeaderboardEntryData[];
  total: number;
  hasMore: boolean;
}
