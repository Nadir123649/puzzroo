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
    """Count solutions up to `limit` (early-exits once `limit` reached)."""
    br, bc = box_dims(size)
    work = [row[:] for row in grid]

    def backtrack() -> int:
        spot = _find_empty(work, size)
        if spot is None:
            return 1
        r, c = spot
        total = 0
        for n in _candidates(work, size, br, bc, r, c):
            work[r][c] = n
            total += backtrack()
            work[r][c] = 0
            if total >= limit:
                return total
        return total

    return backtrack()


def has_unique_solution(grid: list[list[int]], size: int) -> bool:
    return count_solutions(grid, size, limit=2) == 1
