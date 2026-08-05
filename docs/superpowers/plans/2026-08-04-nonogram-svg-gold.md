# Nonogram SVG Gold Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace the low-quality premium Nonogram pipeline (792 hand-authored grids â†’ `easy-premium.json` 500x10x10) with an SVG-driven gold pipeline: 50 hand-authored SVGs â†’ sharp rasterization â†’ 10x10 binary matrix â†’ clues â†’ validation â†’ `easy-gold.json` (50), human visual review gate before activation, then premium removal.

**Architecture:** A Node bridge (`tools/puzzle-generators/svg_to_grid.js`) rasterizes each 100x100 viewBox SVG to 1000x1000 raw RGBA with sharp and computes a 10x10 binary matrix (per-cell mean alpha coverage of the 100x100 block, threshold 0.5) â†’ `rasterized.json`. Then a Python generator (`tools/puzzle-generators/generate_easy_gold.py`) builds clues with `puzzlegen.nonogram.line_solver`, enforces line-solvability (â‡’ unique solution â‡’ no guessing), density [0.20, 0.40], no duplicate grids, and writes the standard JSON records into `shared/src/data/nonogram/easy-gold.json` (target 50, failures rejected, never force-count). A preview sheet is rendered for HUMAN review; activation (wiring `index.ts`, `seed/transform.ts`, `meta.json`, `package.json`, tests) only after an approval artifact `tools/puzzle-generators/previews/gold-review-status.json` `{reviewed: true, reviewer: "<name>", approvedCount: 50, rejectedIds: []}` exists. Premium files deleted last after full regression, with a final grep proving zero references.

**Tech Stack:** Node (sharp ^0.35.3, already a dependency â€” zero new deps), Python 3.14 (numpy, Pillow, NO cairosvg/resvg â€” rasterizer is sharp), TypeScript/Next.js shared data, Mongoose, Vitest.

## Global Constraints
- Do NOT modify or delete legacy `easy.json` / `medium.json` / `hard.json`.
- Do NOT manually patch matrices â€” visual corrections happen ONLY by re-editing the SVG source, then re-rasterizing.
- Premium files are NOT deleted until ALL checks pass (Task 7 is gated on Tasks 1â€“6).
- No commits unless explicitly requested (user git rule).
- No new npm/python dependencies. Rasterizer = sharp (already in `package.json`).
- Every record requires: `id, title, category, sourceSvg, solution, rowClues, columnClues, difficulty, qualityScore, _hash, uniqueSolution, fillDensity, estimatedTime`.
- `id = nonogram-10x10-easy-<sha8>`; `_hash = sha256("nonogram:10:"+sol)` (existing pattern).
- Quality gate: line-solvable (unique, no guessing), fillDensity in [0.20, 0.40], no duplicate solution grids, all 50 accepted only via human approval.
- Gates: hard STOP at Task 4 (no activation without approval artifact); premium deletion only when all prior tasks pass.

---

## Task 0 â€” Save this plan + baseline check
- [x] Plan saved at `docs/superpowers/plans/2026-08-04-nonogram-svg-gold.md`
- [x] Baseline verified: `git status` matches known uncommitted state; sharp 0.35.3 present; `line_solver.py` importable
- [x] Full test run green (98/98) before any new work

## Task 1 â€” Author 50 SVG shapes
- [x] Create `tools/puzzle-generators/svg_shapes/` with subfolders: `animals/` (7), `nature/` (7), `objects/` (6), `food/` (6), `space/` (6), `vehicles/` (6), `symbols/` (6), `characters/` (6)
- [x] Each SVG: 100x100 viewBox, black fill (`#000000`), flat geometry (rect/path/circle/polygon), NO strokes, NO filters, NO text, no white fill-inside (holes must be actual cutouts or avoided)
- [x] `tools/puzzle-generators/svg_shapes/manifest.json`: `{id, title, category, file, description}` per shape
- [x] Verify all 50 SVGs parse (XML) and rasterize to a 10x10 grid with density in [0.20, 0.40]; re-edit SVG (not the matrix) for any that fail
- [x] Sanity: distinct pixel-art appearances; no duplicate grids

## Task 2 â€” Sharp rasterizer bridge (`svg_to_grid.js`)
- [x] Create `tools/puzzle-generators/svg_to_grid.js`: reads each manifest SVG, sharp â†’ 1000x1000 raw RGBA, per-10x10-cell mean alpha coverage â‰¥ 0.5 â†’ 1, else 0
- [x] Output `tools/puzzle-generators/rasterized.json`: `{id, title, category, sourceSvg, solution}` per shape
- [x] TDD: pytest `test_svg_to_grid.py` with all-black / half-filled / transparent fixtures (red â†’ green)
- [x] Rasterize all 50; write `rasterized.json`

## Task 3 â€” Gold generator (`generate_easy_gold.py`)
- [x] Create `tools/puzzle-generators/generate_easy_gold.py` (extends existing `generate_easy_premium.py` patterns, reuses `line_solver.clue_from_line` / `is_line_solvable`)
- [x] Output `shared/src/data/nonogram/easy-gold.json` (50 records, schema above) + `tools/puzzle-generators/gold_report.json` + `tools/puzzle-generators/previews/` preview sheet (one PNG per shape + combined grid)
- [x] Reject (report, do not force): non-line-solvable, density out of range, duplicate grids â†’ target 50 means all 50 must pass or SVGs get re-edited
- [x] Update `validate_nonogram_dataset.py` SINGLE_FILE_SIZES: `easy-premium.json: [10]` â†’ `easy-gold.json: [10]`
- [x] Run validator on `easy-gold.json` â€” must be OK

## Task 4 â€” Human visual review gate (HARD STOP)
- [x] Render preview sheet(s) at `tools/puzzle-generators/previews/`
- [x] User (human) visually reviews each of the 50 shapes against its title
- [x] Required artifact `tools/puzzle-generators/previews/gold-review-status.json`: `{"reviewed": true, "reviewer": "<name>", "approvedCount": 50, "rejectedIds": []}`
- [x] Any rejections â†’ re-edit SVG, re-rasterize, re-generate, re-review
- [x] **NO activation (Task 5) without this artifact. Hard STOP.**

## Task 5 â€” Activate gold as active easy pool
- [x] `shared/src/data/nonogram/index.ts`: `easyPuzzles = buildPool(easyGoldJson)` (import `./easy-gold.json`; drop `./easy-premium.json`)
- [x] `src/lib/server/seed/transform.ts`: `nonogramDocs()` = `[...easyGoldNonogram, ...mediumNonogram, ...hardNonogram]` (premium import removed)
- [x] `shared/src/data/nonogram/meta.json`: `activeDatasets.easy = "easy-gold.json"`, `counts.easy = 50`, generatorVersion bump
- [x] `package.json`: `nonogram:generate` â†’ `generate_easy_gold.py`
- [x] Tests: `src/test/nonogramDataset.test.ts` `TARGET_PER_DIFFICULTY.easy = 50`; `src/scripts/validateNonogramPuzzles.ts` legacy audit aligned
- [x] Full suite green

## Task 6 â€” DB seed + E2E
- [x] Re-seed DB: active easy = 50, all size 10x10, unique titles
- [x] Browser E2E: puzzle list shows gold titles; gameplay works; daily selection works; 0 console errors
- [x] Verify seeded docs reference `easy-gold.json` ids

## Task 7 â€” Delete premium pipeline (only after 1â€“6 pass)
- [x] Delete: `shared/src/data/nonogram/easy-premium.json`, `tools/puzzle-generators/generate_easy_premium.py`, `tools/puzzle-generators/nonogram_shapes_premium/`, `check_premium_shapes.py`, `qa_solve_verify.py`, `qa_fix_shapes.py`, `qa_fix_solve.py`

## Task 8 â€” Post-deletion regression
- [x] Full test suite green
- [x] Grep `easy-premium|premium|qa_fix|qa_solve|check_premium` across repo = zero references (excluding `previews/` history artifacts)
- [x] Final report to user
