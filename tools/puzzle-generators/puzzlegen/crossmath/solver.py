"""CrossMath uniqueness solver.

Abstract model: an N×N operand matrix A. Row i is evaluated left-to-right with
horizontal operators h_ops[i] and must equal row_res[i]; column j likewise with
v_ops and col_res[j]. Some operand cells are blank (unknown, domain 1..9). We
count how many ways the blanks can be filled so that every row and column
equation holds — used to guarantee a unique solution.
"""
from __future__ import annotations


def eval_line(values: list[int], ops: list[str]) -> int | None:
    """Evaluate left-to-right. Returns None if any operator is unknown."""
    if not values:
        return None
    current = values[0]
    for k, op in enumerate(ops):
        b = values[k + 1]
        if op == "+":
            current = current + b
        elif op in ("-", "\u2212"):
            current = current - b
        else:
            return None
    return current


def count_solutions(
    n: int,
    grid: list[list[int | None]],   # None = blank
    h_ops: list[list[str]],
    v_ops: list[list[str]],
    row_res: list[int],
    col_res: list[int],
    values: list[int],              # multiset of numbers to place into the blanks
    limit: int = 2,
) -> int:
    """Count ways to place the `values` multiset into the blank cells so that
    every row and column equation holds. This mirrors how the game is actually
    played (the number pad offers exactly these values with their counts).
    Early-exits once `limit` solutions are found.
    """
    from collections import Counter

    blanks = [(i, j) for i in range(n) for j in range(n) if grid[i][j] is None]
    if len(blanks) != len(values):
        return 0
    work = [row[:] for row in grid]
    counts = Counter(values)
    distinct = sorted(counts)

    def row_complete(i: int) -> bool:
        return all(work[i][j] is not None for j in range(n))

    def col_complete(j: int) -> bool:
        return all(work[i][j] is not None for i in range(n))

    def row_ok(i: int) -> bool:
        return eval_line([work[i][j] for j in range(n)], h_ops[i]) == row_res[i]

    def col_ok(j: int) -> bool:
        return eval_line([work[i][j] for i in range(n)], v_ops[j]) == col_res[j]

    def backtrack(idx: int) -> int:
        if idx == len(blanks):
            return 1
        i, j = blanks[idx]
        total = 0
        for v in distinct:
            if counts[v] == 0:
                continue
            work[i][j] = v
            counts[v] -= 1
            ok = True
            if row_complete(i) and not row_ok(i):
                ok = False
            if ok and col_complete(j) and not col_ok(j):
                ok = False
            if ok:
                total += backtrack(idx + 1)
            counts[v] += 1
            work[i][j] = None
            if total >= limit:
                return total
        return total

    return backtrack(0)
