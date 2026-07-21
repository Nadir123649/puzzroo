"""Validate the generated CrossMath datasets (industry-standard guarantees).

For every puzzle in shared/src/data/crossmath/{easy,medium,hard}.json:
  * correct compact structure (id, difficulty, patternId, solution, blanks, ...)
  * unique id, no duplicate content hash
  * EXACTLY ONE solution when the blanks are filled (pattern-aware solver,
    given the shown operators + result cells)  <-- core uniqueness guarantee
  * solution consistent with the pattern (every NUMBER cell present; each
    equation's result cell equals the evaluated operands)
  * blanks ⊆ pattern inner NUMBER cells; availableNumbers == distinct blank values
  * blank ratio within the expected band for its difficulty
  * all result cells in [1, max_result]

Prints a per-difficulty report and exits non-zero on any FAIL.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from puzzlegen.crossmath.patterns import get_pattern, inner_number_cells
from puzzlegen.crossmath.generator import MAX_RESULT
from puzzlegen.crossmath.solver import count_solutions

DEFAULT_DATA = HERE.parent.parent / "shared" / "src" / "data" / "crossmath"

DIFFICULTIES = ("easy", "medium", "hard")
# Expected blank-ratio band (inner operand cells blanked) per difficulty.
RATIO_BAND = {
    "easy": (0.30, 0.60),
    "medium": (0.40, 0.75),
    "hard": (0.45, 0.90),
}


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
    hashes: set[str] = set()
    nonunique = 0
    bad_struct = 0
    mismatch = 0
    out_of_band = 0
    bad_ratio = 0
    bad_avail = 0
    pat_dist: dict[int, int] = {}

    for rec in data:
        rid = rec.get("id")
        if rid in ids:
            print(f"  [FAIL] {name}: duplicate id {rid}")
            ok = False
        ids.add(rid)
        h = rec.get("_hash")
        if h in hashes:
            print(f"  [WARN] {name}: duplicate hash ({rid})")
        hashes.add(h)

        pattern = get_pattern(rec.get("patternId"))
        if pattern is None:
            print(f"  [FAIL] {name}: unknown patternId {rec.get('patternId')} ({rid})")
            ok = False
            bad_struct += 1
            continue

        solution = rec.get("solution", {})
        blanks = rec.get("blanks", [])
        avail = rec.get("availableNumbers", [])

        # structural keys
        if not isinstance(solution, dict) or not isinstance(blanks, list):
            bad_struct += 1
            ok = False
            continue

        # pattern consistency: every NUMBER cell present in solution
        cell_type = {(c.row, c.col): c for c in pattern.cells}
        for pc in pattern.cells:
            if pc.type == "NUMBER":
                key = f"{pc.row}-{pc.col}"
                if key not in solution:
                    mismatch += 1
                    ok = False

        # each equation: result cell equals evaluated operands
        for eq in pattern.equations:
            nums = []
            ops = []
            result_key = f"{eq.cells[-1][0]}-{eq.cells[-1][1]}"
            for (r, c) in eq.cells:
                t = cell_type[(r, c)].type
                key = f"{r}-{c}"
                if t == "NUMBER":
                    if key == result_key:
                        continue
                    nums.append(solution[key])
                elif t == "OPERATOR":
                    ops.append(cell_type[(r, c)].operator or "+")
            current = nums[0]
            for k, op in enumerate(ops):
                b = nums[k + 1]
                current = current + b if op == "+" else current - b
            if current != solution[result_key]:
                mismatch += 1
                ok = False
            if not (1 <= solution[result_key] <= MAX_RESULT):
                out_of_band += 1

        # blanks subset of inner NUMBER cells
        inner = set(f"{r}-{c}" for (r, c) in inner_number_cells(pattern))
        for b in blanks:
            if b not in inner:
                mismatch += 1
                ok = False

        # availableNumbers == distinct blanked values
        if sorted(avail) != sorted({solution[b] for b in blanks}):
            bad_avail += 1

        # uniqueness: exactly one way to fill the blanks
        values = [solution[b] for b in blanks]
        if count_solutions(pattern, solution, blanks, values, limit=2) != 1:
            nonunique += 1

        # blank ratio band
        inner_total = len(inner)
        if inner_total:
            ratio = len(blanks) / inner_total
            lo, hi = RATIO_BAND[name]
            if not (lo <= ratio <= hi):
                bad_ratio += 1

        pat_dist[rec.get("patternId")] = pat_dist.get(rec.get("patternId"), 0) + 1

    if nonunique:
        print(f"  [FAIL] {name}: {nonunique} puzzles WITHOUT a unique solution")
        ok = False
    if mismatch:
        print(f"  [FAIL] {name}: {mismatch} structure/solution mismatches")
        ok = False
    if bad_struct:
        print(f" [FAIL] {name}: {bad_struct} structurally invalid puzzles")
        ok = False
    if bad_avail:
        print(f"  [WARN] {name}: {bad_avail} puzzles with wrong availableNumbers")
    if bad_ratio:
        print(f"  [WARN] {name}: {bad_ratio} puzzles outside ratio band {RATIO_BAND[name]}")
    if out_of_band:
        print(f"  [WARN] {name}: {out_of_band} result cells outside [1,{MAX_RESULT}]")

    status = "OK  " if ok else "FAIL"
    print(f"  [{status}] {name}: {len(data)} puzzles, patterns={dict(sorted(pat_dist.items()))}, "
          f"nonunique={nonunique}, mismatch={mismatch}, badAvail={bad_avail}")
    return ok


def main() -> int:
    ap = argparse.ArgumentParser(description="Validate generated CrossMath datasets.")
    ap.add_argument("--data", type=str, default=str(DEFAULT_DATA))
    ap.add_argument("--min-count", type=int, default=1)
    args = ap.parse_args()

    data_dir = Path(args.data)
    print(f"Validating CrossMath datasets in {data_dir}")
    all_ok = True
    for name in DIFFICULTIES:
        path = data_dir / f"{name}.json"
        if not validate_difficulty(name, path, args.min_count):
            all_ok = False

    if all_ok:
        print("All CrossMath datasets valid.")
        return 0
    print("CrossMath dataset validation FAILED.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
