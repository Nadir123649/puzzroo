"""Nonogram line-solver: pure logical deduction (no guessing).

Cell states: -1 unknown, 0 empty, 1 filled. A puzzle is "line-solvable" when
iterating single-line deductions across all rows and columns determines every
cell. Line-solvability to completion also guarantees a unique solution.
"""
from __future__ import annotations


def clue_from_line(line: list[int]) -> list[int]:
    runs, count = [], 0
    for v in line:
        if v == 1:
            count += 1
        elif count:
            runs.append(count)
            count = 0
    if count:
        runs.append(count)
    return runs


def deduce_line(clue: list[int], cells: list[int]) -> list[int] | None:
    """Return cells with all logically-forced values filled in, using an
    O(len * blocks) DP over reachable placement states. None => contradiction.

    cells use -1 unknown, 0 known-empty, 1 known-filled.
    """
    length = len(cells)
    m = len(clue)
    memo: dict[tuple[int, int], bool] = {}

    def can(i: int, j: int) -> bool:
        """Can blocks[j:] be validly placed in cells[i:] given knowns?"""
        key = (i, j)
        if key in memo:
            return memo[key]
        if j == m:
            res = all(cells[k] != 1 for k in range(i, length))
            memo[key] = res
            return res
        if i >= length:
            memo[key] = False
            return False
        res = False
        # leave cell i empty
        if cells[i] != 1 and can(i + 1, j):
            res = True
        if not res:
            # place block j starting at i
            b = clue[j]
            if i + b <= length and all(cells[k] != 0 for k in range(i, i + b)):
                end = i + b
                if end == length:
                    res = (j + 1 == m)
                elif cells[end] != 1:  # forced gap after block
                    res = can(end + 1, j + 1)
        memo[key] = res
        return res

    if not can(0, 0):
        return None

    can_fill = [False] * length
    can_empty = [False] * length

    # BFS over reachable, completable states, marking cell possibilities.
    seen: set[tuple[int, int]] = set()
    stack = [(0, 0)]
    while stack:
        i, j = stack.pop()
        if (i, j) in seen or i >= length:
            continue
        seen.add((i, j))
        # option: cell i empty
        if cells[i] != 1 and can(i + 1, j):
            can_empty[i] = True
            stack.append((i + 1, j))
        # option: place block j at i
        if j < m:
            b = clue[j]
            if i + b <= length and all(cells[k] != 0 for k in range(i, i + b)):
                end = i + b
                if end == length:
                    if j + 1 == m:
                        for k in range(i, end):
                            can_fill[k] = True
                elif cells[end] != 1 and can(end + 1, j + 1):
                    for k in range(i, end):
                        can_fill[k] = True
                    can_empty[end] = True
                    stack.append((end + 1, j + 1))

    new = list(cells)
    for i in range(length):
        cf, ce = can_fill[i], can_empty[i]
        if cf and not ce:
            new[i] = 1
        elif ce and not cf:
            new[i] = 0
    return new


def solve(row_clues: list[list[int]], col_clues: list[list[int]], rows: int, cols: int):
    """Return solved grid (values -1/0/1). Cells left -1 mean logic stalled."""
    grid = [[-1] * cols for _ in range(rows)]
    changed = True
    while changed:
        changed = False
        for r in range(rows):
            new = deduce_line(row_clues[r], grid[r])
            if new is None:
                return None
            if new != grid[r]:
                grid[r] = new
                changed = True
        for c in range(cols):
            col = [grid[r][c] for r in range(rows)]
            new = deduce_line(col_clues[c], col)
            if new is None:
                return None
            if new != col:
                for r in range(rows):
                    grid[r][c] = new[r]
                changed = True
    return grid


def is_line_solvable(solution: list[list[int]]) -> bool:
    rows = len(solution)
    cols = len(solution[0])
    row_clues = [clue_from_line(solution[r]) for r in range(rows)]
    col_clues = [clue_from_line([solution[r][c] for r in range(rows)]) for c in range(cols)]
    solved = solve(row_clues, col_clues, rows, cols)
    if solved is None:
        return False
    return solved == solution
