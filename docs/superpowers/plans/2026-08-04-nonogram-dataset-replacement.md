# Nonogram Dataset Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all nonogram datasets with shapes from `NonoDataset`, remove expert difficulty, map easy=5x5 / medium=10x10 / hard=15x15, 1000 puzzles each (3000 total), with real titles surfaced everywhere.

**Architecture:** A Python converter (`tools/puzzle-generators/export_nonogram_from_nono_dataset.py`) reads NonoDataset `.npz`/`.png` sources, filters to line-solvable (unique-solution) puzzles using the existing `puzzlegen.nonogram.line_solver`, assigns titles from emoji PNG filenames, and writes the existing JSON record schema into `shared/src/data/nonogram/{easy,medium,hard}.json`. Then `expert` is purged across shared types, frontend hooks/components, API routes, server models/validators and generator tooling. UI unchanged — data swap only.

**Tech Stack:** Python 3 (numpy, Pillow), TypeScript/Next.js shared data, Mongoose models, Vitest.

## Global Constraints
- Difficulties for nonogram become ONLY `easy | medium | hard` (sudoku/crossmath/tangram keep `expert`).
- Grid sizes: easy=5, medium=10, hard=15. No 20/25/30 for nonogram.
- Exactly 1000 puzzles per difficulty, all unique-solution (line-solvable), title shown in existing UI slot (`currentPuzzle.title`).
- Record schema must match current: `{id, title, difficulty, size, category, estimatedTime, sol, rowClues, columnClues, _hash, uniqueSolution, fillDensity}`.
- No new UI features. Only data replacement + expert removal.
- `daily.ts` and `getTodaysDailyPuzzle` are deleted; daily challenge continues via the existing server daily endpoint on the main pool (same rules as other 3 games).

---