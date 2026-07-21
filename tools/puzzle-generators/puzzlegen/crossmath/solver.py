"""Pattern-aware CrossMath uniqueness solver.

A puzzle is defined by a BoardPattern plus a full assignment of values to every
NUMBER cell (operands AND the shown results). Some operand cells are blanked
(unknown). The player is given the operators and the result cells; they must fill
the blanks. We count how many assignments of the blanked values satisfy every
equation (evaluated left-to-right), guaranteeing exactly one => a unique puzzle.

Result cells are FIXED constraints, not variables, so we only ever backtrack over
the operand blanks.
"""
from __future__ import annotations

from collections import Counter
from typing import Dict, List, Tuple

from puzzlegen.crossmath.patterns import BoardPattern

# A cell coordinate key "r-c"
Coord = Tuple[int, int]


def eval_line(values: List[int], ops: List[str]) -> int | None:
    """Left-to-right eval. ops are between consecutive values."""
    if not values:
        return None
    current = values[0]
    for k, op in enumerate(ops):
        b = values[k + 1]
        if op == "+":
            current = current + b
        elif op in ("-", "\u2212"):
            current = current - b
        else:
            return None
    return current


def count_solutions(
    pattern: BoardPattern,
    solution: Dict[str, int],
    blanks: List[str],
    values: List[int],
    limit: int = 2,
    budget: int | None = None,
) -> int:
    """Count ways to fill `blanks` (list of 'r-c' keys) with the `values` multiset
    such that every equation holds given its fixed result cell. Early-exits at
    `limit`. Returns:
      * the count (capped at `limit`) if a verdict is reached, or
      * -1 if the search node `budget` is exceeded (verdict unknown).
    A budget lets the generator skip a dig step instead of hanging on a
    hard-to-verify (but still unique) blank."""
    cell_type = {(c.row, c.col): c for c in pattern.cells}

    # Precompute equation structure: for each equation, ordered operand coords,
    # ordered operator coords, and the result coord.
    eqs = []
    for eq in pattern.equations:
        operands: List[Coord] = []
        operators: List[Coord] = []
        for (r, c) in eq.cells:
            t = cell_type[(r, c)].type
            if t == "NUMBER":
                operands.append((r, c))
            elif t == "OPERATOR":
                operators.append((r, c))
        result = eq.cells[-1]
        eqs.append((operands, operators, result))

    blank_coord = [tuple(int(x) for x in k.split("-")) for k in blanks]

    # value at each coordinate: start from solution, None where blank
    work: Dict[Coord, int | None] = {}
    for k, v in solution.items():
        work[tuple(int(x) for x in k.split("-"))] = v
    for coord in blank_coord:
        work[coord] = None

    # Which equations contain a given blank coordinate (for incremental checks)
    eqs_by_coord: Dict[Coord, List[int]] = {}
    for idx, (operands, _ops, _res) in enumerate(eqs):
        for coord in operands:
            eqs_by_coord.setdefault(coord, []).append(idx)

    counts = Counter(values)
    distinct = sorted(counts)
    nodes = [0]

    def eq_ok(idx: int) -> bool:
        operands, operators, result = eqs[idx]
        vals = [work[coord] for coord in operands]
        if any(v is None for v in vals):
            return True  # not fully filled yet -> defer
        ops = [cell_type[opc].operator for opc in operators]
        computed = eval_line(vals, ops)
        if computed is None:
            return False
        return computed == work[result]

    def backtrack(i: int) -> int:
        if budget is not None:
            nodes[0] += 1
            if nodes[0] > budget:
                return -1  # unknown: budget exceeded
        if i == len(blank_coord):
            return 1
        coord = blank_coord[i]
        total = 0
        for v in distinct:
            if counts[v] == 0:
                continue
            work[coord] = v
            counts[v] -= 1
            ok = True
            for idx in eqs_by_coord.get(coord, []):
                if not eq_ok(idx):
                    ok = False
                    break
            if ok:
                res = backtrack(i + 1)
                if res < 0:
                    counts[v] += 1
                    work[coord] = None
                    return -1
                total += res
            counts[v] += 1
            work[coord] = None
            if total >= limit:
                return total
        return total

    return backtrack(0)
