import { connectDB } from "@/lib/server/db";
import SudokuPuzzle from "@/lib/server/models/SudokuPuzzle";
import NonogramPuzzle from "@/lib/server/models/NonogramPuzzle";
import CrossMathPuzzle from "@/lib/server/models/CrossMathPuzzle";
import TangramPuzzle from "@/lib/server/models/TangramPuzzle";
import {
  sudokuDocs,
  nonogramDocs,
  crossMathDocs,
  tangramDocs,
} from "./transform";

interface SeedResult {
  game: string;
  inserted: number;
  updated: number;
  total: number;
}

/**
 * Upsert a set of transformed docs into a model, keyed by puzzleId.
 * Idempotent: re-running only updates changed fields, never duplicates.
 */
async function upsert(model: any, docs: any[], dry: boolean): Promise<SeedResult> {
  if (dry) {
    return { game: model.modelName, inserted: 0, updated: docs.length, total: docs.length };
  }
  const ops = docs.map((d) => ({
    updateOne: {
      filter: { puzzleId: d.puzzleId },
      update: { $set: d },
      upsert: true,
    },
  }));
  const result = await model.bulkWrite(ops, { ordered: false });
  return {
    game: model.modelName,
    inserted: result.upsertedCount,
    updated: result.modifiedCount,
    total: docs.length,
  };
}

export async function seedAll(dry = false): Promise<SeedResult[]> {
  await connectDB();
  const results: SeedResult[] = [];
  results.push(await upsert(SudokuPuzzle, sudokuDocs(), dry));
  results.push(await upsert(NonogramPuzzle, nonogramDocs(), dry));
  results.push(await upsert(CrossMathPuzzle, crossMathDocs(), dry));
  results.push(await upsert(TangramPuzzle, tangramDocs(), dry));
  return results;
}
