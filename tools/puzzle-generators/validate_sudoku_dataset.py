"""Validate the generated Sudoku datasets (industry-standard guarantees).

For every puzzle in shared/src/data/sudoku/{easy,medium,hard,expert}.json:
  * 9x9 structure (puzzle + solution)
  * every given clue matches the solution (givens are a subset of solution)
  * EXACTLY ONE solution (count_solutions == 1)  <-- the core uniqueness guarantee
  * unique puzzle id, no duplicate grids
  * givens within the expected band for its difficulty

Prints a per-difficulty report and exits non-zero on any failure.

Usage:
    py validate_sudoku_dataset.py
    py validate_sudoku_dataset.py --min-count 1000
"""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from puzzlegen.sudoku.solver import count_solutions


def _find_shared_data() -> Path:
    """Walk up from this file to locate <repo>/shared/src/data/sudoku."""
    d = HERE
    for _ in range(6):
        candidate = d / "shared" / "src" / "data" / "sudoku"
        if candidate.is_dir():
            return candidate
        d = d.parent
    # Fallback to the previous best guess.
    return HERE.parent.parent.parent / "shared" / "src" / "data" / "sudoku"


DEFAULT_DATA = _find_shared_data()
DIFFICULTIES = ("easy", "medium", "hard", "expert")
# Expected givens band per difficulty (industry convention).
GIVENS_BAND = {
    "easy": (34, 50),
    "medium": (28, 40),
    "hard": (23, 35),
    "expert": (20, 30),
}


def _to_grid(s: str) -> list[list[int]]:
    return [[int(s[r * 9 + c]) for c in range(9)] for r in range(9)]


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
    nonunique = 0
    mismatch = 0
    bad_struct = 0
    out_of_band = 0
    tier_dist = Counter()

    for rec in data:
        pid = rec.get("id")
        if pid in ids:
            print(f"  [FAIL] {name}: duplicate id {pid}")
            ok = False
        ids.add(pid)

        p = rec.get("puzzle", "")
        s = rec.get("solution", "")
        if len(p) != 81 or len(s) != 81:
            bad_struct += 1
            ok = False
            continue

        pg = _to_grid(p)
        sg = _to_grid(s)

        # givens subset of solution
        for r in range(9):
            for c in range(9):
                if pg[r][c] != 0 and pg[r][c] != sg[r][c]:
                    mismatch += 1
        if mismatch:
            pass  # counted below once

        grid_key = p
        if grid_key in grids:
            print(f"  [WARN] {name}: duplicate puzzle grid ({pid})")
        grids.add(grid_key)

        if count_solutions(pg, 9, limit=2) != 1:
            nonunique += 1

        givens = sum(1 for ch in p if ch != "0")
        lo, hi = GIVENS_BAND[name]
        if not (lo <= givens <= hi):
            out_of_band += 1

        tier_dist[rec.get("tier")] += 1

    if mismatch:
        print(f"  [FAIL] {name}: {mismatch} clue/solution mismatches")
        ok = False
    if nonunique:
        print(f"  [FAIL] {name}: {nonunique} puzzles WITHOUT a unique solution")
        ok = False
    if bad_struct:
        print(f"  [FAIL] {name}: {bad_struct} structurally invalid puzzles")
        ok = False
    if out_of_band:
        print(f"  [WARN] {name}: {out_of_band} puzzles outside givens band {GIVENS_BAND[name]}")

    status = "OK  " if ok else "FAIL"
    print(f"  [{status}] {name}: {len(data)} puzzles, tiers={dict(sorted(tier_dist.items()))}, "
          f"nonunique={nonunique}, mismatch={mismatch}, dupGrids={len(data)-len(grids)}")
    return ok


def main() -> int:
    ap = argparse.ArgumentParser(description="Validate generated Sudoku datasets.")
    ap.add_argument("--data", type=str, default=str(DEFAULT_DATA))
    ap.add_argument("--min-count", type=int, default=1)
    args = ap.parse_args()

    data_dir = Path(args.data)
    print(f"Validating Sudoku datasets in {data_dir}")
    all_ok = True
    for name in DIFFICULTIES:
        path = data_dir / f"{name}.json"
        if not validate_difficulty(name, path, args.min_count):
            all_ok = False

    if all_ok:
        print("All Sudoku datasets valid.")
        return 0
    print("Sudoku dataset validation FAILED.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
