"""Sudoku generator: full solution via randomized backtracking, then dig holes
while preserving a unique solution. Difficulty is assigned by TECHNIQUE TIER
(see puzzlegen/sudoku/rating.py), not by clue count.

Pipeline for one puzzle:
  1. Generate a random full solution.
  2. Dig to the *minimum* givens (max removal) while the solution stays unique.
  3. Rate the puzzle (hardest required technique -> tier).
  4. If too hard, add clues back until the tier matches the target difficulty.
     If too easy (tier below target, e.g. a 30-clue board solvable by singles),
     discard and retry with a fresh solution. Expert also accepts genuinely
     low-clue boards (<=25 givens) that our logic ladder does not fully crack.
"""
from __future__ import annotations

import random

from puzzlegen.common.config import Bucket, SUDOKU_TIERS
from puzzlegen.sudoku.solver import box_dims, count_solutions
from puzzlegen.sudoku.rating import rate


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


def _dig(solution: list[list[int]], size: int, givens_min: int, rng: random.Random):
    """Remove clues (preserving a unique solution) down to `givens_min`.

    Returns (puzzle, removed_order) where removed_order is the list of
    (r, c, value) tuples in the order they were emptied (so we can re-add them).
    Returns (None, None) if the board could not be dug to within +2 of the floor.
    """
    puzzle = [row[:] for row in solution]
    cells = [(r, c) for r in range(size) for c in range(size)]
    rng.shuffle(cells)
    givens = size * size
    removed_order: list[tuple[int, int, int]] = []

    for (r, c) in cells:
        if givens <= givens_min:
            break
        saved = puzzle[r][c]
        if saved == 0:
            continue
        puzzle[r][c] = 0
        if count_solutions(puzzle, size, limit=2) == 1:
            givens -= 1
            removed_order.append((r, c, saved))
        else:
            puzzle[r][c] = saved

    if givens > givens_min + 2:
        return None, None
    return puzzle, removed_order


def _givens(puzzle: list[list[int]]) -> int:
    return sum(1 for row in puzzle for v in row if v != 0)


def build_one(bucket: Bucket, rng: random.Random):
    size = bucket.size
    target_tier = SUDOKU_TIERS[bucket.difficulty]
    lo = bucket.params["givens_min"]
    hi = bucket.params["givens_max"]

    solution = _fill_full(size, rng)
    # Dig to the band floor (most holes) while the solution stays unique.
    puzzle, removed = _dig(solution, size, lo, rng)
    if puzzle is None:
        return None, None

    r = rate(puzzle, solution)

    # Difficulty is the givens band; the technique rater only tags the puzzle
    # and guards against gross mislabelling. Reject only when the puzzle is
    # rated more than one tier ABOVE the expected band (e.g. an "easy" board
    # that actually requires expert techniques) so labels stay honest.
    if r["tier"] > target_tier + 1:
        return None, None

    # Trim any over-digged clues back into the band (defensive; _dig stops at lo).
    while _givens(puzzle) > hi and removed:
        rr, cc, saved = removed.pop()
        puzzle[rr][cc] = saved

    givens = _givens(puzzle)
    fields = {
        "puzzle": puzzle,
        "solution": solution,
        "givens": givens,
        "tier": r["tier"],
        "techniques": r["techniques"],
        "solvableByLogic": r["solvable_by_logic"],
    }
    hash_payload = {"g": "sudoku", "s": size, "p": puzzle}
    return fields, hash_payload
