"""Premium shape library QA — fix pass for non-line-solvable shapes.

Some authored shapes are not line-solvable (the pure logical solver cannot
deduce every cell), so the generator would silently skip them and their
titles would never appear. This pass repairs each failing shape by flipping
the fewest symmetric cell pairs until the puzzle solves uniquely.

Strategy, from cheapest to priciest:
  1. for the left-right symmetric pair containing each mismatch cell, flip
     both to empty, and re-test
  2. try single-cell flips on mismatch cells
  3. random local perturbations (rng), keeping connectivity/bbox/density

A shape is accepted once it is line-solvable AND still passes the structural
checks from check_premium_shapes.

Usage:
    py qa_fix_solve.py            # dry run
    py qa_fix_solve.py --apply    # rewrite module files
"""
from __future__ import annotations

import argparse
import random
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import nonogram_shapes_premium as nsp
from qa_solve_verify import grid_from_rows
from puzzlegen.nonogram.line_solver import clue_from_line, solve

SIZE = 10
MIN_FILLED = 4
MIN_BBOX = 0.40
MIN_DENSITY = 0.15
MAX_DENSITY = 0.55

NEIGH8 = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]


def row_clues_of(grid):
    return [clue_from_line(grid[r]) for r in range(SIZE)]


def col_clues_of(grid):
    return [clue_from_line([grid[r][c] for r in range(SIZE)]) for c in range(SIZE)]


def line_solvable(grid) -> bool:
    solved = solve(row_clues_of(grid), col_clues_of(grid), SIZE, SIZE)
    return solved is not None and solved == grid


def connected(grid) -> bool:
    filled = {(r, c) for r in range(SIZE) for c in range(SIZE) if grid[r][c]}
    if not filled:
        return False
    seen = set()
    stack = [next(iter(filled))]
    while stack:
        r, c = stack.pop()
        if (r, c) in seen:
            continue
        seen.add((r, c))
        for dr, dc in NEIGH8:
            nb = (r + dr, c + dc)
            if nb in filled and nb not in seen:
                stack.append(nb)
    return len(seen) == len(filled)


def bbox_coverage(grid) -> float:
    rows = [r for r in range(SIZE) if any(grid[r])]
    if not rows:
        return 0.0
    cols = [c for c in range(SIZE) if any(grid[r][c] for r in range(SIZE))]
    return (max(rows) - min(rows) + 1) * (max(cols) - min(cols) + 1) / (SIZE * SIZE)


def density(grid) -> float:
    return sum(sum(r) for r in grid) / (SIZE * SIZE)


def structural(grid) -> bool:
    filled = sum(sum(r) for r in grid)
    return (filled >= MIN_FILLED and connected(grid)
            and bbox_coverage(grid) >= MIN_BBOX
            and MIN_DENSITY <= density(grid) <= MAX_DENSITY)


def mismatch_cells(grid) -> list[tuple[int, int]]:
    solved = solve(row_clues_of(grid), col_clues_of(grid), SIZE, SIZE)
    if solved is None or solved == grid:
        return []
    return [(r, c) for r in range(SIZE) for c in range(SIZE) if solved[r][c] != grid[r][c]]


def flipped(grid, flips: list[tuple[int, int]]) -> list[list[int]]:
    g = [row[:] for row in grid]
    for r, c in flips:
        g[r][c] = 1 - g[r][c]
    return g


def repair(grid, rng) -> list[list[int]] | None:
    """Flip cells until line-solvable + structural, or None."""
    cells = mismatch_cells(grid)

    # 1. symmetric pair erasure on each mismatched cell (mirror around x=4.5 or y=4.5)
    for rr, cc in cells:
        for (m_other, label) in (((rr, SIZE - 1 - cc), "col"), ((SIZE - 1 - rr, cc), "row")):
            pair = [(rr, cc), m_other]
            if pair[0] == pair[1] or len(set(pair)) == 1:
                continue
            cand = flipped(grid, pair)
            if structural(cand) and line_solvable(cand):
                return cand

    # 2. single-cell flips on mismatch cells
    for rr, cc in cells:
        cand = flipped(grid, [(rr, cc)])
        if structural(cand) and line_solvable(cand):
            return cand

    # 3. random local perturbations
    for _ in range(2000):
        n = rng.randint(1, 4)
        flips = []
        for _ in range(n):
            r, c = rng.randrange(SIZE), rng.randrange(SIZE)
            flips.append((r, c))
        cand = flipped(grid, flips)
        if structural(cand) and line_solvable(cand):
            return cand
    return None


HEADER = '''"""Premium {cat} shapes - newly authored sparse outline-glyph icons."""
SHAPES = {{
{body}
}}
'''

def format_shape(name, data):
    grid = '", "'.join(data["grid"])
    return f'    "{name}": {{"category": "{data["category"]}", "grid": ["{grid}"]}},'

def rewrite_modules(modules: dict) -> int:
    written = 0
    for mod_name, shapes in modules.items():
        body_lines = [format_shape(n, d) for n, d in shapes.items()]
        text = HEADER.format(cat=mod_name, body="\n".join(body_lines))
        path = HERE / "nonogram_shapes_premium" / f"{mod_name}.py"
        if path.read_text(encoding="utf-8") != text:
            path.write_text(text, encoding="utf-8")
            written += 1
    return written


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--seed", type=int, default=20260804)
    args = ap.parse_args()
    rng = random.Random(args.seed)

    nsp.collect_all_shapes()  # ensure submodules load
    fixed = 0
    failed: list[str] = []
    modules: dict[str, dict] = {}

    for mod_name in ("animals", "nature", "food", "objects",
                     "space", "vehicles", "symbols", "characters"):
        mod = getattr(nsp, mod_name)
        modules[mod_name] = {}
        for name, data in mod.SHAPES.items():
            grid = grid_from_rows(data["grid"])
            if structural(grid) and line_solvable(grid):
                modules[mod_name][name] = data
                continue
            if not structural(grid):
                failed.append(f"{name} ({mod_name}): not structurally valid")
                modules[mod_name][name] = data
                continue
            new_grid = repair(grid, rng)
            if new_grid is None:
                failed.append(f"{name} ({mod_name}): no repair found")
                modules[mod_name][name] = data
                continue
            fixed += 1
            modules[mod_name][name] = {
                "category": data["category"],
                "grid": ["".join("1" if v else "0" for v in row) for row in new_grid],
            }

    print(f"Fixed {fixed} non-line-solvable shapes.")
    if failed:
        print(f"{len(failed)} shapes left unfixed:")
        for m in failed:
            print(f"  [FAIL] {m}")
    else:
        print("All shapes line-solvable.")

    if args.apply:
        written = rewrite_modules(modules)
        print(f"Rewrote {written} module file(s).")
    else:
        print("Dry run only - rerun with --apply to write files.")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())