"""Sudoku generator: full solution via randomized backtracking, then dig holes
while preserving a unique solution until the target givens count is reached."""
from __future__ import annotations

import random

from puzzlegen.common.config import Bucket
from puzzlegen.sudoku.solver import box_dims, count_solutions


def _fill_full(size: int, rng: random.Random) -> list[list[int]]:
    br, bc = box_dims(size)
    grid = [[0] * size for _ in range(size)]

    def candidates(r: int, c: int) -> list[int]:
        used = set()
        for i in range(size):
            used.add(grid[r][i])
            used.add(grid[i][c])
        box_r, box_c = (r // br) * br, (c // bc) * bc
        for i in range(box_r, box_r + br):
            for j in range(box_c, box_c + bc):
                used.add(grid[i][j])
        opts = [n for n in range(1, size + 1) if n not in used]
        rng.shuffle(opts)
        return opts

    def solve(pos: int) -> bool:
        if pos == size * size:
            return True
        r, c = divmod(pos, size)
        for n in candidates(r, c):
            grid[r][c] = n
            if solve(pos + 1):
                return True
            grid[r][c] = 0
        return False

    solve(0)
    return grid


def _dig(solution: list[list[int]], size: int, givens_target: int, rng: random.Random) -> list[list[int]] | None:
    puzzle = [row[:] for row in solution]
    cells = [(r, c) for r in range(size) for c in range(size)]
    rng.shuffle(cells)
    givens = size * size

    for (r, c) in cells:
        if givens <= givens_target:
            break
        saved = puzzle[r][c]
        if saved == 0:
            continue
        puzzle[r][c] = 0
        # Keep the hole only if the puzzle still has exactly one solution.
        if count_solutions(puzzle, size, limit=2) == 1:
            givens -= 1
        else:
            puzzle[r][c] = saved

    if givens > givens_target + 2:  # couldn't dig deep enough
        return None
    return puzzle


def build_one(bucket: Bucket, rng: random.Random):
    size = bucket.size
    lo = bucket.params["givens_min"]
    hi = bucket.params["givens_max"]
    target = rng.randint(lo, hi)

    solution = _fill_full(size, rng)
    puzzle = _dig(solution, size, target, rng)
    if puzzle is None:
        return None, None

    givens = sum(1 for r in range(size) for c in range(size) if puzzle[r][c] != 0)

    fields = {
        "puzzle": puzzle,
        "solution": solution,
        "givens": givens,
    }
    hash_payload = {"g": "sudoku", "s": size, "p": puzzle}
    return fields, hash_payload
