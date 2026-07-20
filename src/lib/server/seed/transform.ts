/**
 * Transforms the canonical generated datasets (@shared/data/...) into the
 * minimal Mongoose storage shape used by the puzzle models. The API decodes /
 * reconstructs these back to client-ready shapes at read time.
 *
 * `dailyIndex` is assigned deterministically within each (game, difficulty)
 * bucket so the daily endpoint can pick a stable puzzle by date seed.
 */
import easySudoku from "@shared/data/sudoku/easy.json";
import mediumSudoku from "@shared/data/sudoku/medium.json";
import hardSudoku from "@shared/data/sudoku/hard.json";
import expertSudoku from "@shared/data/sudoku/expert.json";

import easyNonogram from "@shared/data/nonogram/easy.json";
import mediumNonogram from "@shared/data/nonogram/medium.json";
import hardNonogram from "@shared/data/nonogram/hard.json";
import expertNonogram from "@shared/data/nonogram/expert.json";

import easyCrossMath from "@shared/data/crossmath/easy.json";
import mediumCrossMath from "@shared/data/crossmath/medium.json";
import hardCrossMath from "@shared/data/crossmath/hard.json";

import {
  easyPuzzles as easyTangram,
  mediumPuzzles as mediumTangram,
  hardPuzzles as hardTangram,
} from "@shared/data/tangram";

const GENERATOR_VERSION = "1.0.0";

interface IndexedDoc {
  puzzleId: string;
  difficulty: string;
  dailyIndex?: number;
  [key: string]: unknown;
}

function assignDailyIndex(docs: IndexedDoc[]): IndexedDoc[] {
  const byDiff = new Map<string, IndexedDoc[]>();
  for (const d of docs) {
    const arr = byDiff.get(d.difficulty) || [];
    arr.push(d);
    byDiff.set(d.difficulty, arr);
  }
  for (const arr of byDiff.values()) {
    arr.sort((a, b) => a.puzzleId.localeCompare(b.puzzleId));
    arr.forEach((d, i) => (d.dailyIndex = i));
  }
  return docs;
}

function decodeSol(sol: string, size: number): number[][] {
  const board: number[][] = [];
  for (let r = 0; r < size; r++) {
    const row: number[] = [];
    for (let c = 0; c < size; c++) row.push(Number(sol[r * size + c]));
    board.push(row);
  }
  return board;
}

export function sudokuDocs(): IndexedDoc[] {
  const raw = [...easySudoku, ...mediumSudoku, ...hardSudoku, ...expertSudoku] as any[];
  const docs = raw.map((r) => ({
    puzzleId: r.id,
    difficulty: r.difficulty,
    puzzle: r.puzzle,
    solution: r.solution,
    givens: r.givens,
    tier: r.tier,
    techniques: r.techniques || [],
    solvableByLogic: r.solvableByLogic ?? true,
    size: 9,
    hash: r._hash || "",
    generatorVersion: GENERATOR_VERSION,
  }));
  return assignDailyIndex(docs);
}

export function nonogramDocs(): IndexedDoc[] {
  const raw = [...easyNonogram, ...mediumNonogram, ...hardNonogram, ...expertNonogram] as any[];
  const docs = raw.map((r) => ({
    puzzleId: r.id,
    difficulty: r.difficulty,
    size: r.size,
    title: r.title || "Nonogram",
    category: r.category || "generated",
    estimatedTime: r.estimatedTime || 0,
    solution: decodeSol(r.sol, r.size),
    rowClues: r.rowClues,
    columnClues: r.columnClues,
    hash: r._hash || "",
    generatorVersion: GENERATOR_VERSION,
  }));
  return assignDailyIndex(docs);
}

export function crossMathDocs(): IndexedDoc[] {
  const raw = [...easyCrossMath, ...mediumCrossMath, ...hardCrossMath] as any[];
  const docs = raw.map((r) => ({
    puzzleId: r.id,
    difficulty: r.difficulty,
    patternId: r.patternId,
    solution: r.solution,
    blanks: r.blanks || [],
    availableNumbers: r.availableNumbers || [],
    maxMistakes: r.maxMistakes ?? 3,
    size: 0,
    hash: r._hash || "",
    generatorVersion: GENERATOR_VERSION,
  }));
  return assignDailyIndex(docs);
}

export function tangramDocs(): IndexedDoc[] {
  const raw = [...easyTangram, ...mediumTangram, ...hardTangram] as any[];
  const docs = raw.map((r: any) => ({
    puzzleId: r.id,
    sourceId: r.sourceId,
    difficulty: r.difficulty,
    pieceShapeIds: r.pieceShapeIds,
    individualPiecePolygons: r.individualPiecePolygons,
    fullPolygon: r.fullPolygon,
    gameType: "tangram",
    active: r.active ?? true,
    hash: r._hash || r.id,
    generatorVersion: GENERATOR_VERSION,
  }));
  return assignDailyIndex(docs);
}
