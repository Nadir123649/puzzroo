import type { TangramPieceId } from '@shared/types/tangram-polygon';

export type SessionStatus = 'active' | 'paused' | 'completed' | 'abandoned';

export interface TangramPieceState {
  pieceId: TangramPieceId;
  position: { x: number; y: number };
  rotation: number;
  flipped: boolean;
  placed: boolean;
}

export interface PausedState {
  pieceStates: TangramPieceState[];
  elapsedSeconds: number;
  hintsUsed: number;
}

export interface CompletionResult {
  isCorrect: boolean;
  accuracy: number;
  piecesCorrect: number;
  totalPieces: number;
}

export interface VerificationRequest {
  puzzleId: string;
  pieceStates: TangramPieceState[];
}

export interface PieceVerificationResult {
  pieceId: TangramPieceId;
  correct: boolean;
  positionMatch: boolean;
  rotationMatch: boolean;
  error?: string;
}

export interface VerificationResult {
  valid: boolean;
  accuracy: number;
  piecesCorrect: number;
  totalPieces: number;
  pieceResults: PieceVerificationResult[];
  errors: string[];
}

export interface PuzzleQuery {
  difficulty?: string;
  excludeCompleted?: boolean;
  excludeAbandoned?: boolean;
  excludeActive?: boolean;
  category?: string;
}

export interface DailyChallengeResponse {
  puzzle: Record<string, unknown>;
  dailyStatus: {
    completed: boolean;
    elapsedSeconds: number;
    accuracy: number;
  } | null;
}

export interface PlayerStatsResponse {
  totalPlayed: number;
  totalCompleted: number;
  totalAbandoned: number;
  totalTime: number;
  averageTime: number;
  averageAccuracy: number;
  currentStreak: number;
  longestStreak: number;
  favoriteDifficulty: string | null;
  bestTime: number;
  totalHintsUsed: number;
  totalMistakes: number;
  perDifficulty: {
    easy: { played: number; completed: number; bestTime: number; averageTime: number };
    medium: { played: number; completed: number; bestTime: number; averageTime: number };
    hard: { played: number; completed: number; bestTime: number; averageTime: number };
  };
  recentSessions: Array<{
    sessionId: string;
    puzzleId: string;
    difficulty: string;
    status: string;
    elapsedSeconds: number;
    completedAt: string | null;
  }>;
}
