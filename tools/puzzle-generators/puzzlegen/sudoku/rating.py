"""Technique-based Sudoku difficulty rating.

This module classifies a puzzle by the *hardest human technique* required to
solve it, using an escalating-solver strategy:

  Tier 1  Naked Single, Hidden Single
  Tier 2  Naked/Hidden Pair, Pointing (Claiming), Box-Line Reduction
  Tier 3  Naked/Hidden Triple, X-Wing, XY-Wing, XYZ-Wing
  Tier 4  Swordfish, Simple Coloring

If a puzzle cannot be completed with the full logic ladder (it would require
guessing / brute force), it is rated Tier 4 ("expert / evil").

The rating is the *minimal* tier needed: we only escalate to a harder tier
when all easier techniques stall, so unnecessary higher-tier eliminations do
not inflate the rating.

`rate(puzzle, solution)` is the public entrypoint and validates every single
placement against the known solution, bailing out safely on inconsistency.
"""

from __future__ import annotations

from typing import Optional

SIZE = 9
BOX = 3

# Unit indices are precomputed once.
_UNITS: list[list[tuple[int, int]]] = []
for r in range(SIZE):
    _UNITS.append([(r, c) for c in range(SIZE)])
for c in range(SIZE):
    _UNITS.append([(r, c) for r in range(SIZE)])
for br in range(BOX):
    for bc in range(BOX):
        _UNITS.append([(br * BOX + i, bc * BOX + j) for i in range(BOX) for j in range(BOX)])

# Peer mask per cell (cells sharing a unit).
_PEERS: dict[tuple[int, int], list[tuple[int, int]]] = {}
for r in range(SIZE):
    for c in range(SIZE):
        peers = set()
        for u in _UNITS:
            if (r, c) in u:
                peers.update(u)
        peers.discard((r, c))
        _PEERS[(r, c)] = list(peers)

# Box index per cell.
_BOX_OF: dict[tuple[int, int], int] = {}
for r in range(SIZE):
    for c in range(SIZE):
        _BOX_OF[(r, c)] = (r // BOX) * BOX + (c // BOX)


class RatingError(Exception):
    """Raised when a technique placement disagrees with the known solution."""


class _CandidateGrid:
    def __init__(self, puzzle: list[list[int]], solution: list[list[int]]):
        self.solution = solution
        self.grid: list[list[int]] = [row[:] for row in puzzle]
        self.cands: dict[tuple[int, int], set[int]] = {}
        self._recompute()

    # ---- candidate maintenance ------------------------------------------
    def _recompute(self) -> None:
        self.cands.clear()
        for r in range(SIZE):
            for c in range(SIZE):
                if self.grid[r][c] == 0:
                    self.cands[(r, c)] = self._cell_candidates(r, c)

    def _cell_candidates(self, r: int, c: int) -> set[int]:
        used = set()
        for pr, pc in _PEERS[(r, c)]:
            if self.grid[pr][pc]:
                used.add(self.grid[pr][pc])
        return set(range(1, SIZE + 1)) - used

    def place(self, r: int, c: int, v: int) -> None:
        if self.solution[r][c] != v:
            raise RatingError(f"technique would place {v} at {(r, c)} but solution has {self.solution[r][c]}")
        self.grid[r][c] = v
        self.cands.pop((r, c), None)
        for pr, pc in _PEERS[(r, c)]:
            self.cands.get((pr, pc), set()).discard(v)

    def is_solved(self) -> bool:
        return all(self.grid[r][c] != 0 for r in range(SIZE) for c in range(SIZE))

    def empty_cells(self) -> list[tuple[int, int]]:
        return [(r, c) for (r, c) in self.cands]


# ---- technique primitives -------------------------------------------------

def _naked_singles(g: _CandidateGrid) -> bool:
    changed = False
    for (r, c), cand in list(g.cands.items()):
        if len(cand) == 1:
            g.place(r, c, next(iter(cand)))
            changed = True
    return changed


def _hidden_singles(g: _CandidateGrid) -> bool:
    changed = False
    for unit in _UNITS:
        for v in range(1, SIZE + 1):
            spots = [(r, c) for (r, c) in unit if v in g.cands.get((r, c), set())]
            if len(spots) == 1:
                r, c = spots[0]
                if g.grid[r][c] == 0:
                    g.place(r, c, v)
                    changed = True
    return changed


def _naked_subset(g: _CandidateGrid, k: int) -> bool:
    changed = False
    for unit in _UNITS:
        cells = [(r, c) for (r, c) in unit if (r, c) in g.cands and len(g.cands[(r, c)]) <= k]
        if len(cells) < k:
            continue
        from itertools import combinations
        for combo in combinations(cells, k):
            union: set[int] = set()
            for (r, c) in combo:
                union |= g.cands[(r, c)]
            if len(union) == k:
                for (r, c) in unit:
                    if (r, c) in combo or (r, c) not in g.cands:
                        continue
                    removed = g.cands[(r, c)] - union
                    if removed:
                        g.cands[(r, c)] -= union
                        changed = True
                if changed:
                    break
        if changed:
            break
    return changed


def _hidden_subset(g: _CandidateGrid, k: int) -> bool:
    changed = False
    for unit in _UNITS:
        # digits confined to exactly k cells in this unit
        for v in range(1, SIZE + 1):
            pass
    # Scan digit-groups of size k.
    from itertools import combinations
    for unit in _UNITS:
        digit_cells: dict[int, list[tuple[int, int]]] = {}
        for (r, c) in unit:
            if (r, c) not in g.cands:
                continue
            for v in g.cands[(r, c)]:
                digit_cells.setdefault(v, []).append((r, c))
        digits = [v for v, cells in digit_cells.items() if len(cells) == k]
        for grp in combinations(digits, k):
            cells = []
            ok = True
            for v in grp:
                if digit_cells[v]:
                    cells.extend(digit_cells[v])
                else:
                    ok = False
                    break
            if not ok:
                continue
            cells = list(dict.fromkeys(cells))
            if len(cells) != k:
                continue
            # These k cells must hold exactly the k digits; strip others.
            grp_set = set(grp)
            for (r, c) in cells:
                if g.cands[(r, c)] - grp_set:
                    g.cands[(r, c)] &= grp_set
                    changed = True
    return changed


def _pointing_and_boxline(g: _CandidateGrid) -> bool:
    changed = False
    # Pointing: a digit in a box confined to one row/col.
    for br in range(BOX):
        for bc in range(BOX):
            box_cells = [(br * BOX + i, bc * BOX + j) for i in range(BOX) for j in range(BOX)]
            for v in range(1, SIZE + 1):
                spots = [(r, c) for (r, c) in box_cells if v in g.cands.get((r, c), set())]
                if len(spots) < 2:
                    continue
                rows = {r for (r, c) in spots}
                cols = {c for (r, c) in spots}
                if len(rows) == 1:
                    r = next(iter(rows))
                    for c in range(SIZE):
                        if (r, c) not in box_cells and v in g.cands.get((r, c), set()):
                            g.cands[(r, c)].discard(v)
                            changed = True
                if len(cols) == 1:
                    c = next(iter(cols))
                    for r in range(SIZE):
                        if (r, c) not in box_cells and v in g.cands.get((r, c), set()):
                            g.cands[(r, c)].discard(v)
                            changed = True
    # Box-Line reduction: a digit in a row/col confined to one box.
    for r in range(SIZE):
        for v in range(1, SIZE + 1):
            spots = [(r, c) for c in range(SIZE) if v in g.cands.get((r, c), set())]
            if 2 <= len(spots) <= BOX:
                boxes = {_BOX_OF[(r, c)] for (r, c) in spots}
                if len(boxes) == 1:
                    b = next(iter(boxes))
                    br, bc = divmod(b, BOX)
                    for i in range(BOX):
                        for j in range(BOX):
                            rr, cc = br * BOX + i, bc * BOX + j
                            if rr != r and v in g.cands.get((rr, cc), set()):
                                g.cands[(rr, cc)].discard(v)
                                changed = True
    for c in range(SIZE):
        for v in range(1, SIZE + 1):
            spots = [(r, c) for r in range(SIZE) if v in g.cands.get((r, c), set())]
            if 2 <= len(spots) <= BOX:
                boxes = {_BOX_OF[(r, c)] for (r, c) in spots}
                if len(boxes) == 1:
                    b = next(iter(boxes))
                    br, bc = divmod(b, BOX)
                    for i in range(BOX):
                        for j in range(BOX):
                            rr, cc = br * BOX + i, bc * BOX + j
                            if cc != c and v in g.cands.get((rr, cc), set()):
                                g.cands[(rr, cc)].discard(v)
                                changed = True
    return changed


def _x_wing(g: _CandidateGrid) -> bool:
    changed = False
    # Row-based, then column-based.
    for primary, secondary in (("row", "col"), ("col", "row")):
        for v in range(1, SIZE + 1):
            # groups: for each primary line, set of secondary positions with v candidate
            line_cands: dict[int, list[int]] = {}
            for (r, c), cand in g.cands.items():
                if v not in cand:
                    continue
                line = r if primary == "row" else c
                pos = c if primary == "row" else r
                line_cands.setdefault(line, []).append(pos)
            # find pairs of lines sharing the same two positions
            lines = [ln for ln, ps in line_cands.items() if len(ps) == 2]
            for a, b in _pairs(lines):
                if sorted(line_cands[a]) == sorted(line_cands[b]):
                    cols = sorted(line_cands[a])
                    # eliminate v in those secondary positions on all other lines
                    for (r, c), cand in list(g.cands.items()):
                        if v not in cand:
                            continue
                        if primary == "row":
                            rr, cc = r, c
                        else:
                            rr, cc = c, r
                        if cc in cols and rr not in (a, b):
                            g.cands[(r, c)].discard(v)
                            changed = True
    return changed


def _xy_wing(g: _CandidateGrid) -> bool:
    changed = False
    bivalue = [(r, c) for (r, c) in g.cands if len(g.cands[(r, c)]) == 2]
    for p in bivalue:
        a, b = sorted(g.cands[p])
        for x in bivalue:
            if x == p or not (set(g.cands[x]) == {b, _third(a, b, g.cands[x])}):
                # x must be {b, c}
                continue
            if not _sees(p, x):
                continue
            c = next(iter(set(g.cands[x]) - {b}))
            for y in bivalue:
                if y == p or y == x:
                    continue
                if not (set(g.cands[y]) == {a, c}):
                    continue
                if not _sees(p, y):
                    continue
                # eliminate c from cells seeing both x and y
                for z in list(g.cands):
                    if z == x or z == y or z == p:
                        continue
                    if _sees(z, x) and _sees(z, y) and c in g.cands[z]:
                        g.cands[z].discard(c)
                        changed = True
    return changed


def _xyz_wing(g: _CandidateGrid) -> bool:
    changed = False
    tri = [(r, c) for (r, c) in g.cands if len(g.cands[(r, c)]) == 3]
    for p in tri:
        a, b, c = sorted(g.cands[p])
        for x in list(g.cands):
            if x == p or len(g.cands[x]) != 2 or not _sees(p, x):
                continue
            if not (set(g.cands[x]) <= {a, b, c} and len(set(g.cands[x])) == 2):
                continue
            for y in list(g.cands):
                if y == p or y == x or len(g.cands[y]) != 2 or not _sees(p, y):
                    continue
                if not (set(g.cands[y]) <= {a, b, c} and len(set(g.cands[y])) == 2):
                    continue
                shared = set(g.cands[x]) & set(g.cands[y])
                if len(shared) != 1:
                    continue
                if not _sees(x, y):
                    continue
                d = next(iter(shared))
                for z in list(g.cands):
                    if z in (p, x, y):
                        continue
                    if _sees(z, p) and _sees(z, x) and _sees(z, y) and d in g.cands[z]:
                        g.cands[z].discard(d)
                        changed = True
    return changed


def _swordfish(g: _CandidateGrid) -> bool:
    changed = False
    for primary, secondary in (("row", "col"), ("col", "row")):
        for v in range(1, SIZE + 1):
            line_cands: dict[int, list[int]] = {}
            for (r, c), cand in g.cands.items():
                if v not in cand:
                    continue
                line = r if primary == "row" else c
                pos = c if primary == "row" else r
                line_cands.setdefault(line, []).append(pos)
            lines = [ln for ln, ps in line_cands.items() if 2 <= len(ps) <= 3]
            from itertools import combinations
            for combo in combinations(lines, 3):
                cols: set[int] = set()
                for ln in combo:
                    cols |= set(line_cands[ln])
                if len(cols) != 3:
                    continue
                # every column must appear in at least one of the 3 lines
                if all(any(pos in line_cands[ln] for ln in combo) for pos in cols):
                    for (r, c), cand in list(g.cands.items()):
                        if v not in cand:
                            continue
                        if primary == "row":
                            rr, cc = r, c
                        else:
                            rr, cc = c, r
                        if cc in cols and rr not in combo:
                            g.cands[(r, c)].discard(v)
                            changed = True
    return changed


def _simple_coloring(g: _CandidateGrid) -> bool:
    changed = False
    for v in range(1, SIZE + 1):
        # build strong links: pairs of cells in same unit both holding v as
        # their ONLY candidate for v in that unit (conjugate pairs)
        links: dict[tuple[int, int], list[tuple[int, int]]] = {}
        for unit in _UNITS:
            spots = [(r, c) for (r, c) in unit if v in g.cands.get((r, c), set())]
            if len(spots) == 2:
                a, b = spots
                links.setdefault(a, []).append(b)
                links.setdefault(b, []).append(a)
        # For each connected component, 2-color via DFS.
        visited: set[tuple[int, int]] = set()
        for start in list(links):
            if start in visited:
                continue
            color: dict[tuple[int, int], int] = {}
            stack = [(start, 0)]
            comp: list[tuple[int, int]] = []
            while stack:
                node, col = stack.pop()
                if node in color:
                    continue
                color[node] = col
                comp.append(node)
                for nb in links.get(node, []):
                    stack.append((nb, 1 - col))
            # Rule 1: a cell (outside comp) seeing two same-colored cells -> contradiction
            for (r, c), cand in list(g.cands.items()):
                if v not in cand or (r, c) in color:
                    continue
                seen_cols = {color[o] for o in _peers_of((r, c)) if o in color}
                if len(seen_cols) == 2:
                    g.cands[(r, c)].discard(v)
                    changed = True
            # Rule 2: two same-colored cells seeing each other -> that color invalid
            for node in comp:
                for nb in links.get(node, []):
                    if nb in color and color[nb] == color[node]:
                        for cell in comp:
                            if color[cell] == color[node] and v in g.cands.get(cell, set()):
                                g.cands[cell].discard(v)
                                changed = True
                        break
    return changed


# ---- helpers --------------------------------------------------------------

def _third(a: int, b: int, s: set[int]) -> int:
    return next(iter(s - {a, b}))


def _sees(a: tuple[int, int], b: tuple[int, int]) -> bool:
    return a != b and b in _PEERS[a]


def _peers_of(cell: tuple[int, int]) -> list[tuple[int, int]]:
    return _PEERS[cell]


def _pairs(items: list[int]):
    from itertools import combinations
    return combinations(items, 2)


# Tier -> ordered list of technique functions.
_TECHNIQUES: dict[int, list] = {
    1: [_naked_singles, _hidden_singles],
    2: [_naked_subset, _hidden_subset, _pointing_and_boxline],
    3: [lambda g: _naked_subset(g, 3), lambda g: _hidden_subset(g, 3), _x_wing, _xy_wing, _xyz_wing],
    4: [_swordfish, _simple_coloring],
}


def rate(puzzle: list[list[int]], solution: list[list[int]]) -> dict:
    """Classify a puzzle by required technique tier.

    Returns:
        {
          "tier": int (1-4),
          "difficulty": "easy"|"medium"|"hard"|"expert",
          "solvable_by_logic": bool,
          "techniques": list[str],
        }
    """
    g = _CandidateGrid(puzzle, solution)
    techniques_used: set[str] = set()
    required_tier = 1

    try:
        while not g.is_solved():
            progressed = False
            for tier in range(1, required_tier + 1):
                for fn in _TECHNIQUES[tier]:
                    if fn(g):
                        progressed = True
                        techniques_used.add(fn.__name__)
            if not progressed:
                if required_tier < 4:
                    required_tier += 1
                    # mark that this tier was required to continue
                    required_tier = max(required_tier, required_tier)
                    continue
                else:
                    break
    except RatingError:
        # A placement disagreed with the solution: treat as not logic-solvable.
        return {
            "tier": 4,
            "difficulty": "expert",
            "solvable_by_logic": False,
            "techniques": sorted(techniques_used),
        }

    tier = required_tier if g.is_solved() else 4
    return {
        "tier": tier,
        "difficulty": {1: "easy", 2: "medium", 3: "hard", 4: "expert"}[tier],
        "solvable_by_logic": g.is_solved(),
        "techniques": sorted(techniques_used),
    }
