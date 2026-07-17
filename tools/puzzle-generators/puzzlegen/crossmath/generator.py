"""CrossMath generator.

Builds a dense N×N operand grid where every row and every column forms a valid
left-to-right equation using + / - only. Then blanks some operand cells and
verifies (over digit domain 1..9) that exactly one assignment satisfies all
equations, guaranteeing a unique solution. Finally renders to the app's
Cell[][] grid schema (grid side = 2N+1).
"""
from __future__ import annotations

import random

from puzzlegen.common.config import Bucket
from puzzlegen.crossmath.solver import count_solutions

OPERATORS = ("+", "-")
# Probability of choosing '+'. Biased above 0.5 so that, on larger grids, all
# rows and columns land in a valid positive range often enough to generate.
P_PLUS = 0.7


def _pick_op(rng: random.Random) -> str:
    return "+" if rng.random() < P_PLUS else "-"


def _eval_final(values: list[int], ops: list[str], max_result: int) -> int | None:
    """Left-to-right eval. Only the final result is shown to the player, so we
    require just that it lands in [1, max_result] (intermediates may dip)."""
    current = values[0]
    for k, op in enumerate(ops):
        b = values[k + 1]
        current = current + b if op == "+" else current - b
    if 1 <= current <= max_result:
        return current
    return None


def _build_solution(n: int, max_result: int, rng: random.Random):
    """Return (A, h_ops, v_ops, row_res, col_res) or None if invalid."""
    A = [[rng.randint(1, 9) for _ in range(n)] for _ in range(n)]
    h_ops = [[_pick_op(rng) for _ in range(n - 1)] for _ in range(n)]
    v_ops = [[_pick_op(rng) for _ in range(n - 1)] for _ in range(n)]  # per column

    row_res, col_res = [], []
    for i in range(n):
        r = _eval_final(A[i], h_ops[i], max_result)
        if r is None:
            return None
        row_res.append(r)
    for j in range(n):
        col_vals = [A[i][j] for i in range(n)]
        c = _eval_final(col_vals, v_ops[j], max_result)
        if c is None:
            return None
        col_res.append(c)
    return A, h_ops, v_ops, row_res, col_res


def _render(n, A, h_ops, v_ops, row_res, col_res, blank_cells):
    side = 2 * n + 1
    grid = [[{"type": "empty", "isEditable": False, "row": r, "col": c}
             for c in range(side)] for r in range(side)]
    solution: dict[str, int] = {}
    blank_set = set(blank_cells)

    for i in range(n):
        for j in range(n):
            r, c = 2 * i, 2 * j
            if (i, j) in blank_set:
                grid[r][c] = {"type": "empty", "isEditable": True, "row": r, "col": c}
                solution[f"{r}-{c}"] = A[i][j]
            else:
                grid[r][c] = {"type": "number", "value": A[i][j], "isEditable": False, "row": r, "col": c}

    # horizontal operators + equals + row result
    for i in range(n):
        r = 2 * i
        for j in range(n - 1):
            c = 2 * j + 1
            grid[r][c] = {"type": "operator", "value": h_ops[i][j], "isEditable": False, "row": r, "col": c}
        grid[r][2 * n - 1] = {"type": "operator", "value": "=", "isEditable": False, "row": r, "col": 2 * n - 1}
        grid[r][2 * n] = {"type": "number", "value": row_res[i], "isEditable": False, "row": r, "col": 2 * n}

    # vertical operators + equals + column result
    for j in range(n):
        c = 2 * j
        for i in range(n - 1):
            r = 2 * i + 1
            grid[r][c] = {"type": "operator", "value": v_ops[j][i], "isEditable": False, "row": r, "col": c}
        grid[2 * n - 1][c] = {"type": "operator", "value": "=", "isEditable": False, "row": 2 * n - 1, "col": c}
        grid[2 * n][c] = {"type": "number", "value": col_res[j], "isEditable": False, "row": 2 * n, "col": c}

    return grid, solution, side


def build_one(bucket: Bucket, rng: random.Random):
    n = bucket.params["n"]
    n_blanks = bucket.params["blanks"]
    max_mistakes = bucket.params["max_mistakes"]
    max_result = bucket.params["max_result"]

    built = None
    for _ in range(300):
        built = _build_solution(n, max_result, rng)
        if built is not None:
            break
    if built is None:
        return None, None
    A, h_ops, v_ops, row_res, col_res = built

    # Dig blanks one at a time, keeping a unique solution (over the multiset of
    # blanked values) at every step. Digging reaches far more blanks than random
    # subset sampling before uniqueness breaks.
    all_cells = [(i, j) for i in range(n) for j in range(n)]
    rng.shuffle(all_cells)
    blanks: list[tuple[int, int]] = []
    grid_vals = [[A[i][j] for j in range(n)] for i in range(n)]

    for (i, j) in all_cells:
        if len(blanks) >= n_blanks:
            break
        grid_vals[i][j] = None
        trial = blanks + [(i, j)]
        values = [A[r][c] for (r, c) in trial]
        if count_solutions(n, grid_vals, h_ops, v_ops, row_res, col_res, values, limit=2) == 1:
            blanks = trial
        else:
            grid_vals[i][j] = A[i][j]  # revert

    if len(blanks) < n_blanks:
        return None, None

    grid, solution, side = _render(n, A, h_ops, v_ops, row_res, col_res, blanks)
    available = sorted({A[i][j] for (i, j) in blanks})

    fields = {
        "grid": grid,
        "rows": side,
        "columns": side,
        "availableNumbers": available,
        "maxMistakes": max_mistakes,
        "solution": solution,
    }
    hash_payload = {
        "g": "crossmath", "n": n, "A": A,
        "h": h_ops, "v": v_ops,
        "b": sorted(f"{i}-{j}" for (i, j) in blanks),
    }
    return fields, hash_payload
