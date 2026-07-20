"""CrossMath generator (pattern-aware).

For a chosen BoardPattern, assign random operand values 1..9, evaluate every
equation left-to-right, and store the result in the result cell. Then dig blanks
(operand cells) one at a time, keeping a UNIQUE solution (over the multiset of
blanked values) at every step. Emit a compact record reconstructed at runtime by
the frontend via patterns.ts.

Result cells are capped at MAX_RESULT (default 30, matching the app's
solvePattern cap) so puzzles feel consistent with the live generator.
"""
from __future__ import annotations

import random

from puzzlegen.common.config import Bucket
from puzzlegen.common.hashing import content_hash, puzzle_id
from puzzlegen.crossmath.patterns import (
    BoardPattern,
    get_pattern,
    inner_number_cells,
    patterns_for,
)
from puzzlegen.crossmath.solver import count_solutions

OPERATORS = ("+", "-")
# Probability of '+'. Biased above 0.5 so equations land in a valid range.
P_PLUS = 0.7

# Result-cell cap (parity with TS solvePattern, which caps at 30).
MAX_RESULT = 30


def _pick_op(rng: random.Random) -> str:
    return "+" if rng.random() < P_PLUS else "-"


def _build_solution(pattern: BoardPattern, rng: random.Random):
    """Assign operand values and compute result cells. Return a full
    'r-c' -> value dict, or None if any equation is invalid."""
    cell_type = {(c.row, c.col): c for c in pattern.cells}

    # operand cells (inner NUMBER cells) get random 1..9
    values: dict[str, int] = {}
    result_keys: set[str] = set()
    for eq in pattern.equations:
        last = eq.cells[-1]
        result_keys.add(f"{last[0]}-{last[1]}")

    for pc in pattern.cells:
        if pc.type == "NUMBER":
            key = f"{pc.row}-{pc.col}"
            if key not in result_keys:
                values[key] = rng.randint(1, 9)

    # evaluate each equation -> result cell
    for eq in pattern.equations:
        seq = eq.cells
        result_key = f"{seq[-1][0]}-{seq[-1][1]}"
        nums: list[int] = []
        ops: list[str] = []
        for (r, c) in seq:
            t = cell_type[(r, c)].type
            key = f"{r}-{c}"
            if t == "NUMBER":
                if key == result_key:
                    continue  # result is the answer, not an operand
                nums.append(values[key])
            elif t == "OPERATOR":
                ops.append(cell_type[(r, c)].operator or "+")
        current = nums[0]
        for k, op in enumerate(ops):
            b = nums[k + 1]
            current = current + b if op == "+" else current - b
        if not (1 <= current <= MAX_RESULT):
            return None
        values[result_key] = current

    return values


def build_one(bucket: Bucket, rng: random.Random, pattern_idx: int = 0):
    difficulty = bucket.difficulty
    blank_ratio = bucket.params["blank_ratio"]
    max_mistakes = bucket.params["max_mistakes"]
    # max_result is informational; generation caps at MAX_RESULT above.

    pool = patterns_for(difficulty)
    if not pool:
        return None, None
    pattern: BoardPattern = pool[pattern_idx % len(pool)]

    inner = inner_number_cells(pattern)
    if not inner:
        return None, None

    target_blanks = max(1, min(len(inner), round(len(inner) * blank_ratio)))

    # 2. Dig blanks, keeping uniqueness. Each kept blank is verified unique
    # within a node BUDGET; if verification times out we skip that cell (never
    # keep an unverified blank), so the shipped puzzle is always unique.
    # We retry solution builds and keep the puzzle with the MOST blanks that
    # reaches the target (or, failing that, the best effort with >=1 blank).
    # A wall-clock TIME_BUDGET caps total work so build_one never hangs on the
    # hardest patterns (e.g. hard classic with 25 inner cells).
    BUDGET = 60_000
    TIME_BUDGET = 6.0  # seconds
    import time as _time
    start = _time.time()

    best_blanks: list[str] | None = None
    best_solution: dict[str, int] | None = None

    for _ in range(400):
        if _time.time() - start > TIME_BUDGET:
            break
        solution = _build_solution(pattern, rng)
        if solution is None:
            continue
        order = inner[:]
        rng.shuffle(order)
        blanks: list[str] = []
        for (r, c) in order:
            if _time.time() - start > TIME_BUDGET:
                break
            if len(blanks) >= target_blanks:
                break
            key = f"{r}-{c}"
            trial = blanks + [key]
            values = [solution[k] for k in trial]
            res = count_solutions(pattern, solution, trial, values, limit=2, budget=BUDGET)
            if res == 1:
                blanks = trial
            # res == 2 -> non-unique, revert; res == -1 -> budget exceeded, skip
        if len(blanks) >= target_blanks:
            best_blanks, best_solution = blanks, solution
            break
        if best_blanks is None or len(blanks) > len(best_blanks):
            best_blanks, best_solution = blanks, solution

    if not best_blanks or len(best_blanks) < 1:
        return None, None

    blanks = best_blanks
    solution = best_solution
    blanks_sorted = sorted(blanks)
    available = sorted({solution[k] for k in blanks_sorted})
    sol_out = {k: solution[k] for k in sorted(solution)}

    fields = {
        "id": None,  # filled by exporter via puzzle_id
        "difficulty": difficulty,
        "patternId": pattern.pattern_id,
        "solution": sol_out,
        "blanks": blanks_sorted,
        "availableNumbers": available,
        "maxMistakes": max_mistakes,
    }

    hash_payload = {
        "g": "crossmath",
        "pid": pattern.pattern_id,
        "sol": sol_out,
        "b": blanks_sorted,
    }
    return fields, hash_payload
