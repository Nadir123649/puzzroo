import SudokuPuzzle from "@/lib/server/models/SudokuPuzzle";
import NonogramPuzzle from "@/lib/server/models/NonogramPuzzle";
import CrossMathPuzzle from "@/lib/server/models/CrossMathPuzzle";
import TangramPuzzle from "@/lib/server/models/TangramPuzzle";
import { sudokuToResponse } from "./sudoku";
import { nonogramToResponse } from "./nonogram";
import { crossMathToResponse } from "./crossmath";
import { tangramToResponse } from "./tangram";
import type { GameId } from "./types";

interface GameRegistryEntry {
  model: any;
  toResponse: (doc: any) => unknown;
  difficulties: string[];
}

export const puzzleRegistry: Record<GameId, GameRegistryEntry> = {
  sudoku: {
    model: SudokuPuzzle,
    toResponse: sudokuToResponse,
    difficulties: ["easy", "medium", "hard", "expert"],
  },
  nonogram: {
    model: NonogramPuzzle,
    toResponse: nonogramToResponse,
    difficulties: ["easy", "medium", "hard", "expert"],
  },
  crossmath: {
    model: CrossMathPuzzle,
    toResponse: crossMathToResponse,
    difficulties: ["easy", "medium", "hard"],
  },
  tangram: {
    model: TangramPuzzle,
    toResponse: tangramToResponse,
    difficulties: ["easy", "medium", "hard"],
  },
};

export function getGameRegistry(game: string): GameRegistryEntry | null {
  return (puzzleRegistry as Record<string, GameRegistryEntry>)[game] || null;
}
