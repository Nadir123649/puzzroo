/**
 * Server-side puzzle response contracts.
 *
 * Every `toResponse` mapper returns the EXACT shape the corresponding
 * client hook (`useSudoku`, `useNonogram`, `useCrossMath`, `usePolygonTangram`)
 * already consumes today. Database storage keeps a minimal canonical form
 * (strings / compact records); decoding/reconstruction happens here so the
 * API owns all puzzle logic and the client never re-implements it.
 */

export type GameId = "sudoku" | "nonogram" | "crossmath" | "tangram";

export type Difficulty = "easy" | "medium" | "hard" | "expert";

export interface SudokuPuzzleResponse {
  id: string;
  difficulty: Difficulty;
  puzzle: number[][];
  solution: number[][];
  givens?: number;
  tier?: number;
  techniques?: string[];
  size: 9;
}

export interface Clue {
  values: number[];
}

export interface NonogramPuzzleResponse {
  id: string;
  title: string;
  difficulty: Difficulty;
  size: number;
  category: string;
  estimatedTime: number;
  solution: number[][];
  rowClues: Clue[];
  columnClues: Clue[];
}

export interface CrossMathPuzzleResponse {
  id: string;
  difficulty: Exclude<Difficulty, "expert">;
  patternId: number;
  rows: number;
  columns: number;
  grid: unknown[][];
  availableNumbers: number[];
  maxMistakes: number;
  solution: Record<string, number>;
}

export interface TangramPuzzleResponse {
  id: string;
  sourceId: string;
  difficulty: Exclude<Difficulty, "expert">;
  pieceShapeIds: string[];
  individualPiecePolygons: number[][][];
  fullPolygon: number[][];
  gameType: "tangram";
  active: boolean;
}

export interface PuzzleSummary {
  id: string;
  difficulty: Difficulty;
  title?: string;
  size?: number;
}

export interface CatalogEntry {
  game: GameId;
  total: number;
  byDifficulty: Partial<Record<Difficulty, number>>;
}
