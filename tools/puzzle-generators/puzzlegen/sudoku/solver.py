"""Sudoku solver: counts solutions with an early exit (for uniqueness checks)."""
from __future__ import annotations

# box (rows, cols) per board size
BOX_DIMS = {9: (3, 3), 6: (2, 3)}


def box_dims(size: int) -> tuple[int, int]:
    return BOX_DIMS[size]


def _find_empty(grid: list[list[int]], size: int):
    for r in range(size):
        for c in range(size):
            if grid[r][c] == 0:
                return r, c
    return None


def _candidates(grid: list[list[int]], size: int, br: int, bc: int, r: int, c: int) -> list[int]:
    used = set()
    for i in range(size):
        used.add(grid[r][i])
        used.add(grid[i][c])
    box_r = (r // br) * br
    box_c = (c // bc) * bc
    for i in range(box_r, box_r + br):
        for j in range(box_c, box_c + bc):
            used.add(grid[i][j])
    return [n for n in range(1, size + 1) if n not in used]


def count_solutions(grid: list[list[int]], size: int, limit: int = 2) -> int:
    """Count solutions up to `limit` (early-exits once `limit` reached).

    Uses MRV (minimum-remaining-values) cell selection to prune the search
    tree aggressively, which is critical when checking uniqueness on sparse
    (low-given) boards during hole-digging.
    """
    br, bc = box_dims(size)
    work = [row[:] for row in grid]

    def backtrack() -> int:
        # MRV: pick the empty cell with the fewest candidate values.
        best_r = best_c = -1
        best_cands: list[int] = []
        best_n = size + 1
        for r in range(size):
            for c in range(size):
                if work[r][c] != 0:
                    continue
                used = set()
                for i in range(size):
                    used.add(work[r][i])
                    used.add(work[i][c])
                box_r = (r // br) * br
                box_c = (c // bc) * bc
                for i in range(box_r, box_r + br):
                    for j in range(box_c, box_c + bc):
                        used.add(work[i][j])
                cands = [n for n in range(1, size + 1) if n not in used]
                if len(cands) < best_n:
                    best_n = len(cands)
                    best_r, best_c = r, c
                    best_cands = cands
                    if best_n <= 1:
                        break
            if best_n <= 1:
                break

        if best_r == -1:
            return 1  # no empty cell -> solved

        total = 0
        for n in best_cands:
            work[best_r][best_c] = n
            total += backtrack()
            work[best_r][best_c] = 0
            if total >= limit:
                return total
        return total

    return backtrack()


def has_unique_solution(grid: list[list[int]], size: int) -> bool:
    return count_solutions(grid, size, limit=2) == 1
