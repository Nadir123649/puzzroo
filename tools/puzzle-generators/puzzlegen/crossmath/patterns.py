"""CrossMath board patterns, ported 1:1 from shared/src/data/crossmath/patterns.ts.

Each pattern defines a board SHAPE (no numbers). An equation is the full ordered
cell list: operand NUMBER cells, the OPERATOR cells, the '=' cell, and the
trailing result NUMBER cell. The generator assigns operand values, evaluates
left-to-right, and stores the result in the final cell.

Operators are + / - only (ASCII '-'). Grid sizes: easy 7x7, medium/hard 11x11.
"""
from __future__ import annotations

from dataclasses import dataclass, field


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


OPERATORS_POOL = ["+", "-"]


def _build(difficulty: str, kind: str) -> tuple[list[PatternCell], list[PatternEquation]]:
    size = 7 if difficulty == "easy" else 11
    N = 3 if difficulty == "easy" else 5

    cells: list[PatternCell] = []
    equations: list[PatternEquation] = []

    added: set[str] = set()

    def add_cell(row: int, col: int, ctype: str, op: str | None = None) -> None:
        key = f"{row}-{col}"
        if key in added:
            return
        added.add(key)
        cells.append(PatternCell(row, col, ctype, op))

    op_idx = [0]

    def next_op() -> str:
        op = OPERATORS_POOL[op_idx[0] % len(OPERATORS_POOL)]
        op_idx[0] += 1
        return op

    if kind == "classic":
        for r in range(N):
            row_idx = r * 2
            eq_cells: list[tuple[int, int]] = []
            for c in range(N):
                col_idx = c * 2
                add_cell(row_idx, col_idx, "NUMBER")
                eq_cells.append((row_idx, col_idx))
                if c < N - 1:
                    op_col = col_idx + 1
                    op = next_op()
                    add_cell(row_idx, op_col, "OPERATOR", op)
                    eq_cells.append((row_idx, op_col))
            eq_col = size - 2
            add_cell(row_idx, eq_col, "EQUALS")
            eq_cells.append((row_idx, eq_col))
            res_col = size - 1
            add_cell(row_idx, res_col, "NUMBER")
            eq_cells.append((row_idx, res_col))
            equations.append(PatternEquation(f"eq_h_{r}", "horizontal", eq_cells))

        for c in range(N):
            col_idx = c * 2
            eq_cells = []
            for r in range(N):
                row_idx = r * 2
                add_cell(row_idx, col_idx, "NUMBER")
                eq_cells.append((row_idx, col_idx))
                if r < N - 1:
                    op_row = row_idx + 1
                    op = next_op()
                    add_cell(op_row, col_idx, "OPERATOR", op)
                    eq_cells.append((op_row, col_idx))
            eq_row = size - 2
            add_cell(eq_row, col_idx, "EQUALS")
            eq_cells.append((eq_row, col_idx))
            res_row = size - 1
            add_cell(res_row, col_idx, "NUMBER")
            eq_cells.append((res_row, col_idx))
            equations.append(PatternEquation(f"eq_v_{c}", "vertical", eq_cells))

    elif kind == "cross":
        center = 4 if N == 5 else 2

        h_cells: list[tuple[int, int]] = []
        for c in range(N):
            col_idx = c * 2
            add_cell(center, col_idx, "NUMBER")
            h_cells.append((center, col_idx))
            if c < N - 1:
                op_col = col_idx + 1
                add_cell(center, op_col, "OPERATOR", next_op())
                h_cells.append((center, op_col))
        add_cell(center, size - 2, "EQUALS")
        h_cells.append((center, size - 2))
        add_cell(center, size - 1, "NUMBER")
        h_cells.append((center, size - 1))
        equations.append(PatternEquation("eq_h_center", "horizontal", h_cells))

        v_cells: list[tuple[int, int]] = []
        for r in range(N):
            row_idx = r * 2
            add_cell(row_idx, center, "NUMBER")
            v_cells.append((row_idx, center))
            if r < N - 1:
                op_row = row_idx + 1
                add_cell(op_row, center, "OPERATOR", next_op())
                v_cells.append((op_row, center))
        add_cell(size - 2, center, "EQUALS")
        v_cells.append((size - 2, center))
        add_cell(size - 1, center, "NUMBER")
        v_cells.append((size - 1, center))
        equations.append(PatternEquation("eq_v_center", "vertical", v_cells))

    elif kind == "snake":
        last = size - 1
        eq_idx = size - 2

        e1: list[tuple[int, int]] = []
        for c in range(N):
            col_idx = c * 2
            add_cell(0, col_idx, "NUMBER")
            e1.append((0, col_idx))
            if c < N - 1:
                add_cell(0, col_idx + 1, "OPERATOR", next_op())
                e1.append((0, col_idx + 1))
        add_cell(0, eq_idx, "EQUALS")
        e1.append((0, eq_idx))
        add_cell(0, last, "NUMBER")
        e1.append((0, last))
        equations.append(PatternEquation("eq_snake_top", "horizontal", e1))

        e2: list[tuple[int, int]] = []
        for r in range(N):
            row_idx = r * 2
            add_cell(row_idx, last, "NUMBER")
            e2.append((row_idx, last))
            if r < N - 1:
                add_cell(row_idx + 1, last, "OPERATOR", next_op())
                e2.append((row_idx + 1, last))
        add_cell(eq_idx, last, "EQUALS")
        e2.append((eq_idx, last))
        add_cell(last, last, "NUMBER")
        e2.append((last, last))
        equations.append(PatternEquation("eq_snake_right", "vertical", e2))

        e3: list[tuple[int, int]] = []
        for c in range(N):
            col_idx = last - c * 2
            add_cell(last, col_idx, "NUMBER")
            e3.append((last, col_idx))
            if c < N - 1:
                add_cell(last, col_idx - 1, "OPERATOR", next_op())
                e3.append((last, col_idx - 1))
        add_cell(last, 1, "EQUALS")
        e3.append((last, 1))
        add_cell(last, 0, "NUMBER")
        e3.append((last, 0))
        equations.append(PatternEquation("eq_snake_bottom", "horizontal", e3))

    elif kind == "diamond":
        center = 4 if difficulty == "medium" else 2

        h_cells: list[tuple[int, int]] = []
        for c in range(N):
            col_idx = c * 2
            add_cell(center, col_idx, "NUMBER")
            h_cells.append((center, col_idx))
            if c < N - 1:
                add_cell(center, col_idx + 1, "OPERATOR", next_op())
                h_cells.append((center, col_idx + 1))
        add_cell(center, size - 2, "EQUALS")
        h_cells.append((center, size - 2))
        add_cell(center, size - 1, "NUMBER")
        h_cells.append((center, size - 1))
        equations.append(PatternEquation("eq_diamond_h", "horizontal", h_cells))

        v_cells: list[tuple[int, int]] = []
        for r in range(N):
            row_idx = r * 2
            add_cell(row_idx, center, "NUMBER")
            v_cells.append((row_idx, center))
            if r < N - 1:
                add_cell(row_idx + 1, center, "OPERATOR", next_op())
                v_cells.append((row_idx + 1, center))
        add_cell(size - 2, center, "EQUALS")
        v_cells.append((size - 2, center))
        add_cell(size - 1, center, "NUMBER")
        v_cells.append((size - 1, center))
        equations.append(PatternEquation("eq_diamond_v", "vertical", v_cells))

    elif kind == "maze":
        h_rows = [0, 4, 8]
        for idx, r in enumerate(h_rows):
            if r >= size:
                continue
            eq_cells: list[tuple[int, int]] = []
            for c in range(N):
                col_idx = c * 2
                add_cell(r, col_idx, "NUMBER")
                eq_cells.append((r, col_idx))
                if c < N - 1:
                    add_cell(r, col_idx + 1, "OPERATOR", next_op())
                    eq_cells.append((r, col_idx + 1))
            add_cell(r, size - 2, "EQUALS")
            eq_cells.append((r, size - 2))
            add_cell(r, size - 1, "NUMBER")
            eq_cells.append((r, size - 1))
            equations.append(PatternEquation(f"eq_maze_h_{idx}", "horizontal", eq_cells))

        v_cols = [0, 8]
        for idx, c in enumerate(v_cols):
            if c >= size:
                continue
            eq_cells = []
            for r in range(N):
                row_idx = r * 2
                add_cell(row_idx, c, "NUMBER")
                eq_cells.append((row_idx, c))
                if r < N - 1:
                    add_cell(row_idx + 1, c, "OPERATOR", next_op())
                    eq_cells.append((row_idx + 1, c))
            add_cell(size - 2, c, "EQUALS")
            eq_cells.append((size - 2, c))
            add_cell(size - 1, c, "NUMBER")
            eq_cells.append((size - 1, c))
            equations.append(PatternEquation(f"eq_maze_v_{idx}", "vertical", eq_cells))

    elif kind == "spiral":
        e1: list[tuple[int, int]] = []
        for c in range(5):
            add_cell(0, c * 2, "NUMBER")
            e1.append((0, c * 2))
            if c < 4:
                add_cell(0, c * 2 + 1, "OPERATOR", next_op())
                e1.append((0, c * 2 + 1))
        add_cell(0, 9, "EQUALS")
        e1.append((0, 9))
        add_cell(0, 10, "NUMBER")
        e1.append((0, 10))
        equations.append(PatternEquation("eq1", "horizontal", e1))

        e2: list[tuple[int, int]] = []
        for r in range(5):
            add_cell(r * 2, 8, "NUMBER")
            e2.append((r * 2, 8))
            if r < 4:
                add_cell(r * 2 + 1, 8, "OPERATOR", next_op())
                e2.append((r * 2 + 1, 8))
        add_cell(9, 8, "EQUALS")
        e2.append((9, 8))
        add_cell(10, 8, "NUMBER")
        e2.append((10, 8))
        equations.append(PatternEquation("eq2", "vertical", e2))

        e3: list[tuple[int, int]] = []
        for c in range(5):
            add_cell(8, c * 2, "NUMBER")
            e3.append((8, c * 2))
            if c < 4:
                add_cell(8, c * 2 + 1, "OPERATOR", next_op())
                e3.append((8, c * 2 + 1))
        add_cell(8, 9, "EQUALS")
        e3.append((8, 9))
        add_cell(8, 10, "NUMBER")
        e3.append((8, 10))
        equations.append(PatternEquation("eq3", "horizontal", e3))

        e4: list[tuple[int, int]] = []
        for r in range(1, 5):
            add_cell(r * 2, 0, "NUMBER")
            e4.append((r * 2, 0))
            if r < 4:
                add_cell(r * 2 + 1, 0, "OPERATOR", next_op())
                e4.append((r * 2 + 1, 0))
        add_cell(9, 0, "EQUALS")
        e4.append((9, 0))
        add_cell(10, 0, "NUMBER")
        e4.append((10, 0))
        equations.append(PatternEquation("eq4", "vertical", e4))

        e5: list[tuple[int, int]] = []
        for c in range(4):
            add_cell(4, c * 2, "NUMBER")
            e5.append((4, c * 2))
            if c < 3:
                add_cell(4, c * 2 + 1, "OPERATOR", next_op())
                e5.append((4, c * 2 + 1))
        add_cell(4, 7, "OPERATOR", next_op())
        e5.append((4, 7))
        add_cell(4, 8, "NUMBER")
        e5.append((4, 8))
        add_cell(4, 9, "EQUALS")
        e5.append((4, 9))
        add_cell(4, 10, "NUMBER")
        e5.append((4, 10))
        equations.append(PatternEquation("eq5", "horizontal", e5))

    return cells, equations


# (pattern_id, difficulty, shape_name, kind)
_PATTERNS: list[tuple[int, str, str, str]] = [
    (1, "easy", "Easy Classic", "classic"),
    (2, "easy", "Easy Cross", "cross"),
    (3, "easy", "Easy Snake", "snake"),
    (4, "easy", "Easy Diamond", "diamond"),
    (5, "easy", "Easy Maze", "maze"),
    (6, "medium", "Medium Classic", "classic"),
    (7, "medium", "Medium Cross", "cross"),
    (8, "medium", "Medium Snake", "snake"),
    (9, "medium", "Medium Diamond", "diamond"),
    (10, "medium", "Medium Maze", "maze"),
    (11, "medium", "Medium Spiral", "spiral"),
    (12, "hard", "Hard Classic", "classic"),
    (13, "hard", "Hard Cross", "cross"),
    (14, "hard", "Hard Snake", "snake"),
    (15, "hard", "Hard Diamond", "diamond"),
    (16, "hard", "Hard Maze", "maze"),
    (17, "hard", "Hard Spiral", "spiral"),
]


def _make_pattern(pid: int, difficulty: str, name: str, kind: str) -> BoardPattern:
    size = 7 if difficulty == "easy" else 11
    cells, equations = _build(difficulty, kind)
    return BoardPattern(
        pattern_id=pid,
        shape_name=name,
        grid_rows=size,
        grid_cols=size,
        difficulty=difficulty,
        cells=cells,
        equations=equations,
    )


PATTERNS: list[BoardPattern] = [
    _make_pattern(pid, diff, name, kind) for (pid, diff, name, kind) in _PATTERNS
]


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
