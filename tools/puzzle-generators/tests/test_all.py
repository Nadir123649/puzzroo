"""Self-contained test suite (no pytest needed).

Run with:  py -m tests.test_all      (from tools/puzzle-generators)
Also compatible with:  py -m pytest  (functions are named test_*).
"""
from __future__ import annotations

import random
import traceback

from puzzlegen.common.config import all_buckets
from puzzlegen.common.hashing import content_hash
from puzzlegen.sudoku.generator import build_one as sudoku_build
from puzzlegen.sudoku.solver import has_unique_solution
from puzzlegen.crossmath.generator import build_one as cross_build
from puzzlegen.crossmath.solver import eval_line, count_solutions
from puzzlegen.nonogram.generator import build_one as nono_build
from puzzlegen.nonogram.line_solver import clue_from_line, is_line_solvable, deduce_line


# ── hashing ──────────────────────────────────────────────────────────────────
def test_hash_is_stable_and_order_independent():
    a = content_hash({"x": [1, 2, 3], "y": 5})
    b = content_hash({"y": 5, "x": [1, 2, 3]})
    assert a == b
    assert a != content_hash({"x": [1, 2, 4], "y": 5})


# ── sudoku ───────────────────────────────────────────────────────────────────
def _sudoku_buckets():
    return [b for b in all_buckets() if b.game == "sudoku"]


def test_sudoku_unique_and_consistent():
    rng = random.Random(11)
    for b in _sudoku_buckets():
        fields, _ = sudoku_build(b, rng)
        assert fields is not None, f"failed to build {b.size_label} {b.difficulty}"
        size = b.size
        puzzle, solution = fields["puzzle"], fields["solution"]
        # puzzle givens agree with the solution
        for r in range(size):
            for c in range(size):
                if puzzle[r][c] != 0:
                    assert puzzle[r][c] == solution[r][c]
        # exactly one solution
        assert has_unique_solution(puzzle, size)
        # givens count within bucket bounds
        assert b.params["givens_min"] <= fields["givens"] <= b.params["givens_max"] + 2


# ── crossmath ────────────────────────────────────────────────────────────────
def test_crossmath_equations_and_uniqueness():
    rng = random.Random(12)
    for b in [x for x in all_buckets() if x.game == "crossmath"]:
        fields, _ = cross_build(b, rng)
        assert fields is not None, f"failed crossmath {b.size_label}"
        n = b.params["n"]
        grid = fields["grid"]
        solution = fields["solution"]

        # reconstruct the full operand matrix (shown numbers + solution blanks)
        A = [[None] * n for _ in range(n)]
        for i in range(n):
            for j in range(n):
                cell = grid[2 * i][2 * j]
                if cell["type"] == "number":
                    A[i][j] = cell["value"]
                else:  # blank -> pull from solution map
                    A[i][j] = solution[f"{2*i}-{2*j}"]

        # operators + results from the rendered grid
        h_ops = [[grid[2 * i][2 * j + 1]["value"] for j in range(n - 1)] for i in range(n)]
        v_ops = [[grid[2 * i + 1][2 * j]["value"] for i in range(n - 1)] for j in range(n)]
        row_res = [grid[2 * i][2 * n]["value"] for i in range(n)]
        col_res = [grid[2 * n][2 * j]["value"] for j in range(n)]

        for i in range(n):
            assert eval_line(A[i], h_ops[i]) == row_res[i]
        for j in range(n):
            assert eval_line([A[i][j] for i in range(n)], v_ops[j]) == col_res[j]

        # unique over the multiset of blanked values
        blanks = [(2 * i, 2 * j) for i in range(n) for j in range(n)
                  if grid[2 * i][2 * j]["type"] != "number"]
        assert len(blanks) == b.params["blanks"]
        gvals = [row[:] for row in A]
        for (r, c) in blanks:
            gvals[r // 2][c // 2] = None
        values = [solution[f"{r}-{c}"] for (r, c) in blanks]
        assert count_solutions(n, gvals, h_ops, v_ops, row_res, col_res, values, limit=2) == 1


# ── nonogram ─────────────────────────────────────────────────────────────────
def test_clue_from_line():
    assert clue_from_line([0, 1, 1, 0, 1]) == [2, 1]
    assert clue_from_line([0, 0, 0]) == []
    assert clue_from_line([1, 1, 1]) == [3]


def test_deduce_line_overlap():
    # clue [3] in 4 cells -> middle two cells always filled
    out = deduce_line([3], [-1, -1, -1, -1])
    assert out[1] == 1 and out[2] == 1


def test_nonogram_solvable_and_clues_match():
    rng = random.Random(13)
    for b in [x for x in all_buckets() if x.game == "nonogram"]:
        fields, _ = nono_build(b, rng)
        assert fields is not None, f"failed nonogram {b.size_label}"
        sol = fields["solution"]
        size = b.size
        assert len(sol) == size and all(len(r) == size for r in sol)
        # clues match the solution
        for r in range(size):
            assert fields["rowClues"][r]["values"] == clue_from_line(sol[r])
        for c in range(size):
            assert fields["columnClues"][c]["values"] == clue_from_line([sol[r][c] for r in range(size)])
        # fully line-solvable (implies unique)
        assert is_line_solvable(sol)


def main() -> int:
    tests = [v for k, v in sorted(globals().items()) if k.startswith("test_") and callable(v)]
    failures = 0
    for t in tests:
        try:
            t()
            print(f"  PASS  {t.__name__}")
        except Exception:
            failures += 1
            print(f"  FAIL  {t.__name__}")
            traceback.print_exc()
    print(f"\n{len(tests) - failures}/{len(tests)} passed.")
    return 1 if failures else 0


if __name__ == "__main__":
    import sys
    sys.exit(main())
