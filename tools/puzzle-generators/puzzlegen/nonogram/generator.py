"""Nonogram generator.

Creates a random binary solution at the bucket's target density, derives the
row/column clues, and accepts it only if it is fully line-solvable (which also
makes the solution unique). Renders to the app's PuzzleData schema.
"""
from __future__ import annotations

import random

from puzzlegen.common.config import Bucket
from puzzlegen.nonogram.line_solver import clue_from_line, is_line_solvable

CATEGORY = "generated"


def _random_solution(size: int, density: float, rng: random.Random) -> list[list[int]]:
    grid = [[1 if rng.random() < density else 0 for _ in range(size)] for _ in range(size)]
    # avoid fully empty rows/cols (degenerate) by seeding one filled cell
    for r in range(size):
        if not any(grid[r]):
            grid[r][rng.randrange(size)] = 1
    for c in range(size):
        if not any(grid[r][c] for r in range(size)):
            grid[rng.randrange(size)][c] = 1
    return grid


def _estimated_time(size: int) -> int:
    return int(size * size * 3)


def build_one(bucket: Bucket, rng: random.Random):
    size = bucket.size
    density = bucket.params["density"]

    solution = None
    for _ in range(30):
        candidate = _random_solution(size, density, rng)
        if is_line_solvable(candidate):
            solution = candidate
            break
    if solution is None:
        return None, None

    row_clues = [{"values": clue_from_line(solution[r])} for r in range(size)]
    col_clues = [{"values": clue_from_line([solution[r][c] for r in range(size)])}
                 for c in range(size)]

    fields = {
        "title": f"Nonogram {size}x{size}",
        "size": size,
        "category": CATEGORY,
        "estimatedTime": _estimated_time(size),
        "solution": solution,
        "rowClues": row_clues,
        "columnClues": col_clues,
    }
    hash_payload = {"g": "nonogram", "s": size, "sol": solution}
    return fields, hash_payload
