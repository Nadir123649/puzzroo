# Puzzle Dataset Generators → MongoDB

**Date:** 2026-07-16
**Status:** Built & verified (see "Implementation notes" for decisions that
refined the plan during the build).

## Goal

Standalone Python tooling that generates unique-solution puzzle datasets for three
games (Sudoku, CrossMath, Nonogram) and writes them directly into MongoDB, one
collection per game, segregated by difficulty and size. No changes to the Next.js
app in this effort — wiring the game pages to read from the DB is a later project.

## Decisions

- **Deliverable:** Python generators → MongoDB only (no JSON files, no app integration).
- **DB segregation:** one collection per game — `sudoku_puzzles`, `crossmath_puzzles`,
  `nonogram_puzzles`. Every document tagged with `difficulty` + `size`.
- **Buckets (15):**
  - Sudoku: {6×6, 9×9} × {easy, medium, hard} — difficulty = number of givens.
  - CrossMath: easy 2×2, medium 3×3, hard 6×6 (N = operand grid dimension).
  - Nonogram: easy {5×5, 10×10}, medium {15×15, 20×20}, hard {25×25, 30×30}.
- **Rules:**
  - Sudoku: exactly one solution.
  - CrossMath: N×N operand grid; every row and every column is a valid equation;
    operators `+` and `−` only; unique solution given the blanks + number pad.
  - Nonogram: unique **and** line-solvable (no guessing) at every size.
- **Volume:** default 100 per bucket, configurable via CLI (`--count`).
- **Idempotency:** upsert by content hash (no duplicates across runs); `--reset`
  wipes a bucket/game first; top-up fills a bucket up to `--count`.

## Architecture

```
tools/puzzle-generators/
  requirements.txt
  README.md
  puzzlegen/
    __main__.py            # python -m puzzlegen
    cli.py                 # argparse subcommands per game + `all`
    common/
      db.py                # Mongo connect (+ Atlas SRV/DNS fallback), get_collection, ensure_indexes
      config.py            # bucket table, difficulty params, default counts
      hashing.py           # canonical SHA-256 of puzzle content, puzzleId
      seeding.py           # upsert-by-hash, --reset, top-up loop, tqdm progress
    sudoku/    generator.py, solver.py
    crossmath/ generator.py, solver.py
    nonogram/  generator.py, line_solver.py
  tests/  test_sudoku.py, test_crossmath.py, test_nonogram.py
```

- **Runtime:** Python 3.10+ (dev machine has 3.14 via the `py` launcher).
- **Deps:** `pymongo`, `dnspython`, `python-dotenv`, `tqdm`.

## DB connection

- Read `MONGO_URI` from project `.env.local` (or `--mongo-uri` / `MONGO_URI` env).
- Try `MongoClient(uri)`; on SRV resolution failure, mirror the app's TS fallback:
  resolve `_mongodb._tcp.<host>` SRV + TXT via `dnspython`, build a direct
  `mongodb://…?ssl=true&authSource=admin&retryWrites=true&w=majority`.
- DB name from URI path (default `puzzroo`). `get_collection(game)` → `{game}_puzzles`.
- Indexes ensured on first use: unique `hash`, unique `puzzleId`, compound `{difficulty, size}`.

## Document shapes (mirror existing TS types for easy future integration)

Common metadata: `puzzleId`, `game`, `difficulty`, `size`, `hash` (unique),
`generatorVersion`, `createdAt`.

- **Sudoku:** `puzzle: int[][]`, `solution: int[][]`, `size` (9|6), `givens` (int).
- **CrossMath:** `rows`, `columns`, `n` (2|3|6), `grid: Cell[][]`,
  `availableNumbers: int[]`, `maxMistakes`, `solution: {"r-c": n}`.
- **Nonogram:** `size`, `solution: 0/1[][]`, `rowClues: [{values:[]}]`,
  `columnClues: [{values:[]}]`, `title`, `category`, `estimatedTime`.

`puzzleId = {game}-{sizeLabel}-{difficulty}-{hash[:8]}` (deterministic, dedup-safe).

## Generation algorithms

**Sudoku** (9→3×3 boxes/1-9; 6→2×3 boxes/1-6):
1. Randomized backtracking → full valid solution.
2. Dig holes while a solution-counter (early exit at 2) confirms uniqueness at each step.
3. Given targets — 9×9: easy 40–45 / med 32–36 / hard 26–30; 6×6: easy 22–24 / med 18–20 / hard 14–16.

**CrossMath** (N operands; rendered grid 2N+1 square: 5/7/13; `+`/`−`):
1. Random operands 1–9; random per-row & per-column operators (left-to-right eval).
2. Compute row/column results; reject non-integer, negative running total, or result out of 0–99.
3. Blank operand cells by difficulty (easy ~2, med ~4–5, hard ~10–14); operators/results/edges fixed.
4. `availableNumbers` = blanked cells' values (the pad).
5. Uniqueness gate: backtracking over blanks yields exactly one solution; else re-blank/retry.
   `maxMistakes`: easy 5 / med 4 / hard 3.

**Nonogram** (unique + line-solvable):
1. Random solution grid at target density (easy ~60% / med ~55% / hard ~50%).
2. Derive row/column clues.
3. Line-solver (enumerate clue-consistent line placements, intersect fixed cells, iterate).
   Full exact reconstruction ⇒ unique + line-solvable; else regenerate. Attempt caps prevent hangs.
4. Auto `title`/`category`, heuristic `estimatedTime`.

## CLI & idempotency

```
python -m puzzlegen all              [--count N] [--reset] [--dry-run]
python -m puzzlegen sudoku    [--size 6|9|all]        [--difficulty easy|medium|hard|all] [--count N] [--reset]
python -m puzzlegen crossmath                          [--difficulty …] [--count N] [--reset]
python -m puzzlegen nonogram  [--size 5|10|15|20|25|30|all] [--difficulty …] [--count N] [--reset]
```

- Default 100/bucket; top-up counts existing unless `--reset`.
- Upsert by `hash`. `--dry-run` generates + validates without writing.
- Per-bucket attempt/time caps: on shortfall, write what was made and report it (no infinite hang).

## Testing / verification

- Unit tests: sudoku solution-counter + generated puzzles have exactly one solution and
  correct given counts; nonogram clue derivation + line-solver reconstructs solution;
  crossmath equations valid + unique.
- `--dry-run` for DB-free checks; post-run summary prints per-bucket counts.

## Risks

- Big Nonograms (25/30) line-solvable = slowest → attempt caps + per-bucket count override.
- Atlas SRV/DNS in Python → mirrored fallback.
- Requires Python on the generation machine.

## Implementation notes (decisions made during the build)

These refine the plan above; the code reflects these, not the original text.

- **Nonogram density (inverted + raised).** Low-density large grids are almost
  never uniquely line-solvable (30×30 @ 0.50 = 0/60 in testing) because
  line-solving depends on overlap deductions from large blocks. Final densities:
  **easy 0.55 / medium 0.60 / hard 0.66** (difficulty comes from grid *size*, not
  sparsity). Decision confirmed with the user.
- **Nonogram line-solver = DP.** Replaced clue-placement enumeration with an
  O(len·blocks) DP over reachable placement states (per line: `can(i,j)` memo +
  a forward reachable-state pass marking `can_fill`/`can_empty`). ~1000× faster on
  25–30 grids; enumeration made them unusable.
- **CrossMath uniqueness = multiset (matches gameplay).** The app
  (`useCrossMath.ts` + number pad) offers the exact multiset of blanked solution
  values (each value with a required count). Uniqueness is verified over that
  multiset permutation, not the full 1–9 domain — faithful to how the puzzle is
  played and far more tractable for large boards.
- **CrossMath generation feasibility.** Requiring every *intermediate* value ≥1
  made 6×6 essentially ungenerable (~1/20000). Only the final result is shown to
  the player, so evaluation now requires only the **final** result ∈ [1, 99]
  (intermediates may dip). Operators are biased toward `+` (P(+)=0.7) so all 12
  rows/columns land in range often enough. Blanks are chosen by Sudoku-style
  **digging** (add one blank at a time while the multiset solution stays unique),
  which reaches the target blank count far more reliably than random subsets.
- **Tests.** Implemented as a single self-contained runner `tests/test_all.py`
  (no pytest dependency): `py -m tests.test_all` — covers hashing stability,
  Sudoku uniqueness/consistency, CrossMath equations + multiset-uniqueness,
  Nonogram clue-match + line-solvability, and line-solver deductions. 6/6 pass.
- **Verification run.** A small real run wrote 3 puzzles into each of
  `sudoku_puzzles`, `crossmath_puzzles`, `nonogram_puzzles` (seed 5) confirming
  connectivity, schemas, and unique indexes. Full 100/bucket run is operator-run.
