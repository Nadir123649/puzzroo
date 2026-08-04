"""Premium shape library QA — solve-verification pass.

For every shape in nonogram_shapes_premium:
  * parse the 10x10 grid
  * derive row/column clues
  * run the line-solver to completion
  * assert: puzzle is line-solvable (deduces every cell) AND the deduced
    solution equals the authored grid (unique solution, shape preserved)

A shape that fails here would produce a broken puzzle downstream (generator
would skip it or emit a title whose picture does not match the solution).

Usage:
    py qa_solve_verify.py            # exit 1 on any failure
    py qa_solve_verify.py --summary  # per-category pass/fail summary
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from nonogram_shapes_premium import collect_all_shapes
from puzzlegen.nonogram.line_solver import (
    clue_from_line,
    solve,
)

SIZE = 10


def grid_from_rows(rows: list[str]) -> list[list[int]]:
    return [[int(ch) for ch in row] for row in rows]


def verify(name: str, data: dict) -> str | None:
    """Return error message, or None if the shape solves uniquely."""
    grid = grid_from_rows(data["grid"])
    if len(grid) != SIZE or any(len(r) != SIZE for r in grid):
        return "malformed grid"
    row_clues = [clue_from_line(grid[r]) for r in range(SIZE)]
    col_clues = [clue_from_line([grid[r][c] for r in range(SIZE)]) for c in range(SIZE)]
    solved = solve(row_clues, col_clues, SIZE, SIZE)
    if solved is None:
        return "clues contradictory"
    if solved != grid:
        for r in range(SIZE):
            if solved[r] != grid[r]:
                diff = [c for c in range(SIZE) if solved[r][c] != grid[r][c]]
                return f"solution mismatch at row {r} cols {diff}"
    return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--summary", action="store_true")
    args = ap.parse_args()

    shapes = collect_all_shapes()
    errors: list[str] = []
    stats: dict[str, list[int]] = {}
    for name, data in shapes.items():
        cat = data.get("category", "?")
        stats.setdefault(cat, [0, 0])[1] += 1
        err = verify(name, data)
        if err is None:
            stats[cat][0] += 1
        else:
            errors.append(f"{name} ({cat}): {err}")

    if args.summary:
        print("Category solve-verification:")
        for cat, (ok, total) in sorted(stats.items()):
            print(f"  {cat}: {ok}/{total}")

    if errors:
        print(f"\n{len(errors)} solve failure(s):")
        for e in errors:
            print(f"  [FAIL] {e}")
        return 1

    print(f"\nAll {len(shapes)} premium shapes solve uniquely.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
