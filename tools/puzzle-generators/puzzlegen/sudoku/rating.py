"""Technique-based Sudoku difficulty rating (bitmask-fast implementation).

Classifies a puzzle by the *hardest human technique* required to solve it,
using an escalating-solver strategy:

  Tier 1  Naked Single, Hidden Single
  Tier 2  Naked/Hidden Pair, Pointing (Claiming), Box-Line Reduction
  Tier 3  Naked/Hidden Triple, X-Wing, XY-Wing, XYZ-Wing
  Tier 4  Swordfish, Simple Coloring

If a puzzle cannot be completed with the full logic ladder (it would require
guessing / brute force), it is rated Tier 4 ("expert / evil").

The rating is the *minimal* tier needed: we only escalate to a harder tier
when all easier techniques stall, so unnecessary higher-tier eliminations do
not inflate the rating.

Candidates are stored as 9-bit integer masks (bit v = 1<<v) for speed.

`rate(puzzle, solution)` is the public entrypoint and validates every single
placement against the known solution, bailing out safely on inconsistency.
"""

from __future__ import annotations

from itertools import combinations
from typing import Optional

N = 9
BOX = 3
FULL = 0b1111111110  # bits 1..9 set

# Index helpers: idx = r*9 + c
def _rc(idx: int) -> tuple[int, int]:
    return divmod(idx, N)

# Precompute units (27 lists of 9 indices) and peers.
_UNITS: list[list[int]] = []
for r in range(N):
    _UNITS.append([r * N + c for c in range(N)])
for c in range(N):
    _UNITS.append([r * N + c for r in range(N)])
for br in range(BOX):
    for bc in range(BOX):
        _UNITS.append([(br * BOX + i) * N + (bc * BOX + j) for i in range(BOX) for j in range(BOX)])

_PEERS: list[list[int]] = []
for idx in range(N * N):
    pr, pc = _rc(idx)
    peers = set()
    for u in _UNITS:
        if idx in u:
            peers.update(u)
    peers.discard(idx)
    _PEERS.append(list(peers))

_BOX_OF = [(idx // N // BOX) * BOX + (idx % N // BOX) for idx in range(N * N)]


class RatingError(Exception):
    """Raised when a technique placement disagrees with the known solution."""


class _Grid:
    def __init__(self, puzzle: list[list[int]], solution: list[list[int]]):
        self.solution = [solution[r][c] for r in range(N) for c in range(N)]
        self.grid: list[int] = [puzzle[r][c] for r in range(N) for c in range(N)]
        self.cands: list[int] = [0] * (N * N)
        self._recompute()

    def _recompute(self) -> None:
        for idx in range(N * N):
            if self.grid[idx]:
                self.cands[idx] = 0
            else:
                used = 0
                for p in _PEERS[idx]:
                    if self.grid[p]:
                        used |= 1 << self.grid[p]
                self.cands[idx] = FULL & ~used

    def place(self, idx: int, v: int) -> None:
        if self.solution[idx] != v:
            raise RatingError(f"technique would place {v} at {idx} but solution has {self.solution[idx]}")
        self.grid[idx] = v
        self.cands[idx] = 0
        bit = 1 << v
        for p in _PEERS[idx]:
            if self.grid[p] == 0:
                self.cands[p] &= ~bit

    def is_solved(self) -> bool:
        return all(self.grid[idx] != 0 for idx in range(N * N))

    def empties(self) -> list[int]:
        return [idx for idx in range(N * N) if self.grid[idx] == 0]


# ---- techniques (return True if they changed anything) ---------------------

def _values(mask: int) -> list[int]:
    return [i for i in range(1, N + 1) if mask & (1 << i)]


def _other(vals: list[int], v: int) -> int:
    return vals[0] if vals[1] == v else vals[1]


def _naked_singles(g: _Grid) -> bool:
    changed = False
    for idx in range(N * N):
        if g.grid[idx] == 0 and g.cands[idx].bit_count() == 1:
            g.place(idx, _values(g.cands[idx])[0])
            changed = True
    return changed


def _hidden_singles(g: _Grid) -> bool:
    changed = False
    for unit in _UNITS:
        for d in range(1, N + 1):
            bit = 1 << d
            spots = [idx for idx in unit if g.grid[idx] == 0 and (g.cands[idx] & bit)]
            if len(spots) == 1:
                g.place(spots[0], d)
                changed = True
    return changed


def _naked_subset(g: _Grid, k: int) -> bool:
    changed = False
    for unit in _UNITS:
        cells = [idx for idx in unit if g.grid[idx] == 0 and g.cands[idx].bit_count() <= k]
        if len(cells) < k:
            continue
        for combo in combinations(cells, k):
            union = 0
            for idx in combo:
                union |= g.cands[idx]
            if union.bit_count() == k:
                cset = set(combo)
                for idx in unit:
                    if idx in cset or g.grid[idx] != 0:
                        continue
                    before = g.cands[idx]
                    g.cands[idx] &= ~union
                    if g.cands[idx] != before:
                        changed = True
                if changed:
                    break
        if changed:
            break
    return changed


def _hidden_subset(g: _Grid, k: int) -> bool:
    changed = False
    for unit in _UNITS:
        digit_cells: dict[int, list[int]] = {}
        for idx in unit:
            if g.grid[idx] != 0:
                continue
            for d in range(1, N + 1):
                if g.cands[idx] & (1 << d):
                    digit_cells.setdefault(d, []).append(idx)
        digits = [d for d, cs in digit_cells.items() if len(cs) == k]
        for grp in combinations(digits, k):
            cells: list[int] = []
            for d in grp:
                cells.extend(digit_cells[d])
            cells = list(dict.fromkeys(cells))
            if len(cells) != k:
                continue
            grp_mask = 0
            for d in grp:
                grp_mask |= 1 << d
            for idx in cells:
                before = g.cands[idx]
                g.cands[idx] &= grp_mask
                if g.cands[idx] != before:
                    changed = True
    return changed


def _pointing_and_boxline(g: _Grid) -> bool:
    changed = False
    # Pointing: digit in a box confined to one row/col.
    for br in range(BOX):
        for bc in range(BOX):
            box = [(br * BOX + i) * N + (bc * BOX + j) for i in range(BOX) for j in range(BOX)]
            for d in range(1, N + 1):
                bit = 1 << d
                spots = [idx for idx in box if g.grid[idx] == 0 and (g.cands[idx] & bit)]
                if len(spots) < 2:
                    continue
                rows = {_rc(idx)[0] for idx in spots}
                cols = {_rc(idx)[1] for idx in spots}
                if len(rows) == 1:
                    r = next(iter(rows))
                    for c in range(N):
                        idx = r * N + c
                        if idx not in box and (g.cands[idx] & bit):
                            g.cands[idx] &= ~bit
                            changed = True
                if len(cols) == 1:
                    c = next(iter(cols))
                    for r in range(N):
                        idx = r * N + c
                        if idx not in box and (g.cands[idx] & bit):
                            g.cands[idx] &= ~bit
                            changed = True
    # Box-Line reduction: digit in a row/col confined to one box.
    for r in range(N):
        for d in range(1, N + 1):
            bit = 1 << d
            spots = [r * N + c for c in range(N) if g.grid[r * N + c] == 0 and (g.cands[r * N + c] & bit)]
            if 2 <= len(spots) <= BOX:
                boxes = {_BOX_OF[idx] for idx in spots}
                if len(boxes) == 1:
                    b = next(iter(boxes))
                    br, bc = divmod(b, BOX)
                    for i in range(BOX):
                        for j in range(BOX):
                            idx = (br * BOX + i) * N + (bc * BOX + j)
                            if _rc(idx)[0] != r and (g.cands[idx] & bit):
                                g.cands[idx] &= ~bit
                                changed = True
    for c in range(N):
        for d in range(1, N + 1):
            bit = 1 << d
            spots = [r * N + c for r in range(N) if g.grid[r * N + c] == 0 and (g.cands[r * N + c] & bit)]
            if 2 <= len(spots) <= BOX:
                boxes = {_BOX_OF[idx] for idx in spots}
                if len(boxes) == 1:
                    b = next(iter(boxes))
                    br, bc = divmod(b, BOX)
                    for i in range(BOX):
                        for j in range(BOX):
                            idx = (br * BOX + i) * N + (bc * BOX + j)
                            if _rc(idx)[1] != c and (g.cands[idx] & bit):
                                g.cands[idx] &= ~bit
                                changed = True
    return changed


def _x_wing(g: _Grid) -> bool:
    changed = False
    for primary, secondary in (("row", "col"), ("col", "row")):
        for d in range(1, N + 1):
            bit = 1 << d
            line_cands: dict[int, list[int]] = {}
            for idx in range(N * N):
                if g.grid[idx] != 0 or not (g.cands[idx] & bit):
                    continue
                r, c = _rc(idx)
                line = r if primary == "row" else c
                pos = c if primary == "row" else r
                line_cands.setdefault(line, []).append(pos)
            lines = [ln for ln, ps in line_cands.items() if len(ps) == 2]
            for a, b in combinations(lines, 2):
                if sorted(line_cands[a]) == sorted(line_cands[b]):
                    cols = sorted(line_cands[a])
                    for idx in range(N * N):
                        if g.grid[idx] != 0 or not (g.cands[idx] & bit):
                            continue
                        r, c = _rc(idx)
                        rr = r if primary == "row" else c
                        cc = c if primary == "row" else r
                        if cc in cols and rr not in (a, b):
                            g.cands[idx] &= ~bit
                            changed = True
    return changed


def _xy_wing(g: _Grid) -> bool:
    changed = False
    bi = [idx for idx in range(N * N) if g.grid[idx] == 0 and g.cands[idx].bit_count() == 2]
    for p in bi:
        if g.grid[p] != 0 or g.cands[p].bit_count() != 2:
            continue
        a, b = _values(g.cands[p])
        for x in bi:
            if x == p:
                continue
            if g.grid[x] != 0 or g.cands[x].bit_count() != 2:
                continue
            vx = _values(g.cands[x])
            if len(vx) != 2 or set(vx) != {b, _other(vx, b)}:
                continue
            c = _other(vx, b)
            if not _sees(p, x):
                continue
            for y in bi:
                if y == p or y == x:
                    continue
                if g.grid[y] != 0 or g.cands[y].bit_count() != 2:
                    continue
                vy = _values(g.cands[y])
                if set(vy) != {a, c}:
                    continue
                if not _sees(p, y):
                    continue
                for z in range(N * N):
                    if z in (p, x, y) or g.grid[z] != 0:
                        continue
                    if _sees(z, x) and _sees(z, y) and (g.cands[z] & (1 << c)):
                        g.cands[z] &= ~(1 << c)
                        changed = True
    return changed


def _xyz_wing(g: _Grid) -> bool:
    changed = False
    tri = [idx for idx in range(N * N) if g.grid[idx] == 0 and g.cands[idx].bit_count() == 3]
    for p in tri:
        if g.grid[p] != 0 or g.cands[p].bit_count() != 3:
            continue
        for x in range(N * N):
            if x == p or g.grid[x] != 0 or g.cands[x].bit_count() != 2 or not _sees(p, x):
                continue
            if (g.cands[x] & g.cands[p]) != g.cands[x]:
                continue
            for y in range(N * N):
                if y == p or y == x or g.grid[y] != 0 or g.cands[y].bit_count() != 2 or not _sees(p, y):
                    continue
                if (g.cands[y] & g.cands[p]) != g.cands[y]:
                    continue
                shared = g.cands[x] & g.cands[y]
                if shared.bit_count() != 1:
                    continue
                if not _sees(x, y):
                    continue
                d = _values(shared)[0]
                for z in range(N * N):
                    if z in (p, x, y) or g.grid[z] != 0:
                        continue
                    if _sees(z, p) and _sees(z, x) and _sees(z, y) and (g.cands[z] & (1 << d)):
                        g.cands[z] &= ~(1 << d)
                        changed = True
    return changed


def _swordfish(g: _Grid) -> bool:
    changed = False
    for primary, secondary in (("row", "col"), ("col", "row")):
        for d in range(1, N + 1):
            bit = 1 << d
            line_cands: dict[int, list[int]] = {}
            for idx in range(N * N):
                if g.grid[idx] != 0 or not (g.cands[idx] & bit):
                    continue
                r, c = _rc(idx)
                line = r if primary == "row" else c
                pos = c if primary == "row" else r
                line_cands.setdefault(line, []).append(pos)
            lines = [ln for ln, ps in line_cands.items() if 2 <= len(ps) <= 3]
            for combo in combinations(lines, 3):
                cols: set[int] = set()
                for ln in combo:
                    cols |= set(line_cands[ln])
                if len(cols) != 3:
                    continue
                if all(any(pos in line_cands[ln] for ln in combo) for pos in cols):
                    for idx in range(N * N):
                        if g.grid[idx] != 0 or not (g.cands[idx] & bit):
                            continue
                        r, c = _rc(idx)
                        rr = r if primary == "row" else c
                        cc = c if primary == "row" else r
                        if cc in cols and rr not in combo:
                            g.cands[idx] &= ~bit
                            changed = True
    return changed


def _simple_coloring(g: _Grid) -> bool:
    changed = False
    for d in range(1, N + 1):
        bit = 1 << d
        links: dict[int, list[int]] = {}
        for unit in _UNITS:
            spots = [idx for idx in unit if g.grid[idx] == 0 and (g.cands[idx] & bit)]
            if len(spots) == 2:
                a, b = spots
                links.setdefault(a, []).append(b)
                links.setdefault(b, []).append(a)
        visited: set[int] = set()
        for start in list(links):
            if start in visited:
                continue
            color: dict[int, int] = {}
            stack = [(start, 0)]
            comp: list[int] = []
            while stack:
                node, col = stack.pop()
                if node in color:
                    continue
                color[node] = col
                comp.append(node)
                for nb in links.get(node, []):
                    stack.append((nb, 1 - col))
            for idx in range(N * N):
                if (g.cands[idx] & bit) and idx not in color:
                    seen = {color[o] for o in _PEERS[idx] if o in color}
                    if len(seen) == 2:
                        g.cands[idx] &= ~bit
                        changed = True
            for node in comp:
                for nb in links.get(node, []):
                    if nb in color and color[nb] == color[node]:
                        for cell in comp:
                            if color[cell] == color[node] and (g.cands[cell] & bit):
                                g.cands[cell] &= ~bit
                                changed = True
                        break
    return changed


# ---- helpers --------------------------------------------------------------

def _sees(a: int, b: int) -> bool:
    return a != b and b in _PEERS[a]


_TECHNIQUES: dict[int, list] = {
    1: [_naked_singles, _hidden_singles],
    2: [lambda g: _naked_subset(g, 2), lambda g: _hidden_subset(g, 2), _pointing_and_boxline],
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
    g = _Grid(puzzle, solution)
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
                    continue
                break
    except RatingError:
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
