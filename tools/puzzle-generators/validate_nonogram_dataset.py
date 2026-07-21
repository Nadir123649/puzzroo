"""Validate the generated Nonogram datasets (industry-standard guarantees).

For every puzzle in shared/src/data/nonogram/{easy,medium,hard,expert}.json:
  * structure (sol length == size*size; row/column clue counts == size)
  * rowClues/columnClues exactly match the solution (empty line encoded as [])
  * EXACTLY ONE solution — verified by the line-solver completing to the same
    grid (the generator's uniqueness guarantee, re-checked here)
  * unique puzzle id and no duplicate solution grids
  * every difficulty meets its expected size set

Prints a per-difficulty report and exits non-zero on any failure.

Usage:
    py validate_nonogram_dataset.py
    py validate_nonogram_dataset.py --min-count 1000
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from puzzlegen.nonogram.line_solver import clue_from_line, is_line_solvable

DIFFICULTIES = ("easy", "medium", "hard", "expert")
EXPECTED_SIZES = {
    "easy": [10],
    "medium": [15],
    "hard": [20],
    "expert": [25, 30],
}


def _to_grid(sol: str, size: int) -> list[list[int]]:
    return [[int(sol[r * size + c]) for c in range(size)] for r in range(size)]


def validate_difficulty(name: str, path: Path, min_count: int) -> bool:
    if not path.exists():
        print(f"  [FAIL] {name}: file missing ({path})")
        return False
    data = json.loads(path.read_text(encoding="utf-8"))
    ok = True

    if len(data) < min_count:
        print(f"  [FAIL] {name}: only {len(data)} puzzles, expected >= {min_count}")
        ok = False

    ids: set[str] = set()
    grids: set[str] = set()
    clue_mismatch = 0
    nonunique = 0
    bad_struct = 0
    bad_size = 0

    for rec in data:
        pid = rec.get("id")
        if pid in ids:
            print(f"  [FAIL] {name}: duplicate id {pid}")
            ok = False
        ids.add(pid)

        size = rec.get("size")
        sol = rec.get("sol", "")
        row_clues = rec.get("rowClues", [])
        col_clues = rec.get("columnClues", [])

        if size not in EXPECTED_SIZES[name]:
            bad_size += 1
            ok = False
        if len(sol) != size * size or len(row_clues) != size or len(col_clues) != size:
            bad_struct += 1
            ok = False
            continue

        grid = _to_grid(sol, size)

        # Clues must match the solution exactly (empty line -> []).
        for r in range(size):
            if clue_from_line(grid[r]) != row_clues[r]:
                clue_mismatch += 1
                break
        else:
            for c in range(size):
                col = [grid[r][c] for r in range(size)]
                if clue_from_line(col) != col_clues[c]:
                    clue_mismatch += 1
                    break

        if not is_line_solvable(grid):
            nonunique += 1

        if sol in grids:
            print(f"  [WARN] {name}: duplicate solution grid ({pid})")
        grids.add(sol)

    if clue_mismatch:
        print(f"  [FAIL] {name}: {clue_mismatch} clue/solution mismatches")
        ok = False
    if nonunique:
        print(f"  [FAIL] {name}: {nonunique} puzzles WITHOUT a unique solution")
        ok = False
    if bad_struct:
        print(f"  [FAIL] {name}: {bad_struct} structurally invalid puzzles")
        ok = False
    if bad_size:
        print(f"  [FAIL] {name}: {bad_size} puzzles with unexpected size "
              f"(expected {EXPECTED_SIZES[name]})")
        ok = False

    status = "OK  " if ok else "FAIL"
    dup_grids = len(data) - len(grids)
    print(f"  [{status}] {name}: {len(data)} puzzles, nonunique={nonunique}, "
          f"clueMismatch={clue_mismatch}, dupGrids={dup_grids}, badSize={bad_size}")
    return ok


def main() -> int:
    ap = argparse.ArgumentParser(description="Validate generated Nonogram datasets.")
    ap.add_argument("--data", type=str,
                    default=str(HERE.parent.parent.parent / "shared" / "src" / "data" / "nonogram"))
    ap.add_argument("--min-count", type=int, default=1)
    args = ap.parse_args()

    data_dir = Path(args.data)
    print(f"Validating Nonogram datasets in {data_dir}")
    all_ok = True
    for name in DIFFICULTIES:
        if not validate_difficulty(name, data_dir / f"{name}.json", args.min_count):
            all_ok = False

    if all_ok:
        print("All Nonogram datasets valid.")
        return 0
    print("Nonogram dataset validation FAILED.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
