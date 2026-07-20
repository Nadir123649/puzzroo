"""CrossMath board patterns.

The pattern SHAPES (cell coordinates, types, operators, and equation cell
ordering) are emitted 1:1 from the application's source of truth,
shared/src/data/crossmath/patterns.ts, by tools/puzzle-generators/emit_patterns.mjs
(which is a plain-JS port of that file's createPatternCellsAndEquations). The
generated patterns.json is loaded here so puzzles match the app's rendered
boards exactly (including operator placement).
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

HERE = Path(__file__).resolve().parent
_PATTERNS_JSON = HERE / "patterns.json"


@dataclass(frozen=True)
class PatternCell:
    row: int
    col: int
    type: str  # 'NUMBER' | 'OPERATOR' | 'EQUALS' | 'EMPTY'
    operator: str | None = None


@dataclass(frozen=True)
class PatternEquation:
    id: str
    direction: str  # 'horizontal' | 'vertical'
    cells: list[tuple[int, int]]  # ordered; last cell is the result NUMBER cell


@dataclass(frozen=True)
class BoardPattern:
    pattern_id: int
    shape_name: str
    grid_rows: int
    grid_cols: int
    difficulty: str  # 'easy' | 'medium' | 'hard'
    cells: list[PatternCell] = field(default_factory=list)
    equations: list[PatternEquation] = field(default_factory=list)


def _load() -> list[BoardPattern]:
    raw = json.loads(_PATTERNS_JSON.read_text(encoding="utf-8"))
    out: list[BoardPattern] = []
    for p in raw:
        cells = [PatternCell(c["row"], c["col"], c["type"], c.get("operator")) for c in p["cells"]]
        eqs = [
            PatternEquation(e["id"], e["direction"], [tuple(c) for c in e["cells"]])
            for e in p["equations"]
        ]
        # grid size derived from max coordinate + 1 (patterns are square).
        maxr = max(c["row"] for c in p["cells"])
        maxc = max(c["col"] for c in p["cells"])
        out.append(BoardPattern(
            pattern_id=p["pattern_id"],
            shape_name=p["shape_name"],
            grid_rows=maxr + 1,
            grid_cols=maxc + 1,
            difficulty=p["difficulty"],
            cells=cells,
            equations=eqs,
        ))
    return out


PATTERNS: list[BoardPattern] = _load()
_BY_ID: dict[int, BoardPattern] = {p.pattern_id: p for p in PATTERNS}


def get_pattern(pattern_id: int) -> BoardPattern | None:
    return _BY_ID.get(pattern_id)


def patterns_for(difficulty: str) -> list[BoardPattern]:
    return [p for p in PATTERNS if p.difficulty == difficulty]


def inner_number_cells(pattern: BoardPattern) -> list[tuple[int, int]]:
    """NUMBER cells that are NOT the result (trailing) cell of an equation."""
    result_keys: set[str] = set()
    for eq in pattern.equations:
        last = eq.cells[-1]
        result_keys.add(f"{last[0]}-{last[1]}")
    out: list[tuple[int, int]] = []
    for pc in pattern.cells:
        if pc.type == "NUMBER":
            key = f"{pc.row}-{pc.col}"
            if key not in result_keys:
                out.append((pc.row, pc.col))
    return out
