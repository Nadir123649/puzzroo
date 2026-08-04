"""Self-correcting QA fixer for the premium shape library.

Fixes, in order:
  1. disconnected  -> keep largest 8-way component
  2. over-density  -> erode interior cells (4-neighbor surrounded) until <= MAX
  3. under-density -> grow boundary cells until >= MIN
  4. duplicate grid-> perturb second occurrence until unique + valid

Each step re-validates connectivity, bbox coverage and density. Shapes that
cannot be repaired are reported as "manual" and left untouched.

Usage:
    py qa_fix_shapes.py            # dry run: report what would change
    py qa_fix_shapes.py --apply    # rewrite the *_shapes_premium modules
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import nonogram_shapes_premium as nsp

SIZE = 10
MIN_FILLED = 4
MIN_BBOX = 0.40
MIN_DENSITY = 0.15
MAX_DENSITY = 0.55

NEIGH8 = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
NEIGH4 = [(-1, 0), (0, -1), (0, 1), (1, 0)]


def components(grid: list[list[int]]) -> list[set[tuple[int, int]]]:
    filled = {(r, c) for r in range(SIZE) for c in range(SIZE) if grid[r][c]}
    comps: list[set[tuple[int, int]]] = []
    seen: set[tuple[int, int]] = set()
    for cell in filled:
        if cell in seen:
            continue
        stack, comp = [cell], set()
        while stack:
            cur = stack.pop()
            if cur in seen:
                continue
            seen.add(cur)
            comp.add(cur)
            r, c = cur
            for dr, dc in NEIGH8:
                nb = (r + dr, c + dc)
                if nb in filled and nb not in seen:
                    stack.append(nb)
        comps.append(comp)
    return comps


def connected(grid: list[list[int]]) -> bool:
    return len(components(grid)) == 1


def bbox_coverage(grid: list[list[int]]) -> float:
    rows = [r for r in range(SIZE) if any(grid[r])]
    if not rows:
        return 0.0
    cols = [c for c in range(SIZE) if any(grid[r][c] for r in range(SIZE))]
    return (max(rows) - min(rows) + 1) * (max(cols) - min(cols) + 1) / (SIZE * SIZE)


def density(grid: list[list[int]]) -> float:
    return sum(sum(r) for r in grid) / (SIZE * SIZE)


def valid(grid: list[list[int]]) -> bool:
    filled = sum(sum(r) for r in grid)
    return (filled >= MIN_FILLED and connected(grid)
            and bbox_coverage(grid) >= MIN_BBOX
            and MIN_DENSITY <= density(grid) <= MAX_DENSITY)


def make_grid(rows: list[str]) -> list[list[int]]:
    return [[int(ch) for ch in row] for row in rows]


def grid_key(grid: list[list[int]]) -> str:
    return "".join("".join(str(v) for v in row) for row in grid)


def set_cell(grid: list[list[int]], r: int, c: int, val: int):
    grid[r][c] = val


# ── Repair primitives ─────────────────────────────────────────────────────────

def fix_disconnected(grid: list[list[int]]) -> bool:
    """Keep the largest component; drop strays. True if repaired."""
    comps = components(grid)
    if len(comps) <= 1:
        return False
    biggest = max(comps, key=len)
    changed = False
    for r in range(SIZE):
        for c in range(SIZE):
            if grid[r][c] and (r, c) not in biggest:
                set_cell(grid, r, c, 0)
                changed = True
    return changed


def erosion_order(grid: list[list[int]]) -> list[tuple[int, int]]:
    """All filled cells, most-interior first. Interiority = # of 4-neighbors filled."""
    cells = [(r, c) for r in range(SIZE) for c in range(SIZE) if grid[r][c]]
    cells.sort(key=lambda rc: -sum(0 <= rc[0] + dr < SIZE and 0 <= rc[1] + dc < SIZE
                                   and grid[rc[0] + dr][rc[1] + dc]
                                   for dr, dc in NEIGH4))
    return cells


def erode_once(grid: list[list[int]]) -> bool:
    """Remove one filled cell keeping connectivity + bbox. True if removed."""
    for r, c in erosion_order(grid):
        set_cell(grid, r, c, 0)
        if connected(grid) and bbox_coverage(grid) >= MIN_BBOX:
            return True
        set_cell(grid, r, c, 1)
    return False


def grow_candidates(grid: list[list[int]]) -> list[tuple[int, int]]:
    """Empty cells adjacent (8-way) to filled cells."""
    filled = {(r, c) for r in range(SIZE) for c in range(SIZE) if grid[r][c]}
    out = []
    for r in range(SIZE):
        for c in range(SIZE):
            if grid[r][c]:
                continue
            if any((r + dr, c + dc) in filled for dr, dc in NEIGH8):
                out.append((r, c))
    return out


def grow_once(grid: list[list[int]]) -> bool:
    """Add one boundary cell keeping validity. True if added."""
    for r, c in grow_candidates(grid):
        set_cell(grid, r, c, 1)
        if connected(grid):
            return True
        set_cell(grid, r, c, 0)
    return False


def expand_bbox_once(grid: list[list[int]]) -> bool:
    """Add one cell just outside the current bounding box to grow it."""
    rows = [r for r in range(SIZE) if any(grid[r])]
    if not rows:
        return False
    cols = [c for c in range(SIZE) if any(grid[r][c] for r in range(SIZE))]
    min_r, max_r = min(rows), max(rows)
    min_c, max_c = min(cols), max(cols)

    candidates: list[tuple[int, int]] = []
    if min_r > 0:
        candidates += [(min_r - 1, c) for c in cols if not grid[min_r - 1][c]]
    if max_r < SIZE - 1:
        candidates += [(max_r + 1, c) for c in cols if not grid[max_r + 1][c]]
    if min_c > 0:
        candidates += [(r, min_c - 1) for r in rows if not grid[r][min_c - 1]]
    if max_c < SIZE - 1:
        candidates += [(r, max_c + 1) for r in rows if not grid[r][max_c + 1]]

    for r, c in candidates:
        set_cell(grid, r, c, 1)
        if connected(grid) and density(grid) <= MAX_DENSITY:
            return True
        set_cell(grid, r, c, 0)
    return False


def perturb(grid: list[list[int]], used_keys: set[str], rng) -> list[list[int]] | None:
    """Random flips until grid is unique + valid, or None."""
    for _ in range(800):
        trial = [row[:] for row in grid]
        for _ in range(rng.randint(3, 8)):
            r = rng.randrange(SIZE)
            c = rng.randrange(SIZE)
            trial[r][c] = 1 - trial[r][c]
        if not valid(trial):
            continue
        key = grid_key(trial)
        if key in used_keys:
            continue
        return trial
    return None


# ── Repair driver ─────────────────────────────────────────────────────────────

def repair(name: str, data: dict, used_keys: set[str], rng) -> dict:
    """Return fixed shape data (or original if already valid)."""
    grid = make_grid(data["grid"])
    original_key = grid_key(grid)

    if not connected(grid):
        fix_disconnected(grid)

    for _ in range(60):  # erode
        if density(grid) <= MAX_DENSITY:
            break
        if not erode_once(grid):
            break
    for _ in range(60):  # grow
        if density(grid) >= MIN_DENSITY:
            break
        if not grow_once(grid):
            break
    for _ in range(30):  # expand bounding box
        if bbox_coverage(grid) >= MIN_BBOX:
            break
        if not expand_bbox_once(grid):
            break

    key = grid_key(grid)
    if key in used_keys:
        fixed = perturb(grid, used_keys, rng)
        if fixed is None:
            return data  # manual
        grid = fixed
        key = grid_key(grid)

    if not valid(grid):
        return data  # manual - untouched

    changed = key != original_key
    result = {"category": data["category"],
              "grid": ["".join("1" if v else "0" for v in row) for row in grid]}
    result["_changed"] = changed
    return result


# ── Module rewrite ────────────────────────────────────────────────────────────

HEADER = '''"""Premium {cat} shapes - newly authored sparse outline-glyph icons."""
SHAPES = {{
{body}
}}
'''

def format_shape(name: str, data: dict) -> str:
    grid = '", "'.join(data["grid"])
    return f'    "{name}": {{"category": "{data["category"]}", "grid": ["{grid}"]}},'

def rewrite_modules(modules: dict[str, dict]) -> tuple[int, int]:
    written = changed = 0
    for mod_name, shapes in modules.items():
        body_lines = [format_shape(name, data) for name, data in shapes.items()]
        text = HEADER.format(cat=mod_name, body="\n".join(body_lines))
        path = HERE / "nonogram_shapes_premium" / f"{mod_name}.py"
        if path.read_text(encoding="utf-8") != text:
            path.write_text(text, encoding="utf-8")
            written += 1
        changed += sum(1 for d in shapes.values() if d.get("_changed"))
    return written, changed


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="rewrite module files")
    ap.add_argument("--seed", type=int, default=20260804)
    args = ap.parse_args()

    import random
    rng = random.Random(args.seed)

    all_shapes = nsp.collect_all_shapes()
    used_keys: set[str] = set()
    fixed = 0
    manual: list[str] = []

    modules: dict[str, dict] = {}
    for mod_name in ("animals", "nature", "food", "objects",
                     "space", "vehicles", "symbols", "characters"):
        mod = getattr(nsp, mod_name)
        modules[mod_name] = {}
        for name, data in mod.SHAPES.items():
            before = grid_key(make_grid(data["grid"]))
            repaired = repair(name, data, used_keys, rng)
            key = grid_key(make_grid(repaired["grid"]))
            if key in used_keys or not valid(make_grid(repaired["grid"])):
                manual.append(f"{name} ({mod_name})")
                repaired = data
            else:
                used_keys.add(key)
                if key != before:
                    fixed += 1
            modules[mod_name][name] = repaired

    print(f"Auto-fixed {fixed} shapes.")
    if manual:
        print(f"{len(manual)} shapes need manual attention (left untouched):")
        for m in manual:
            print(f"  [MANUAL] {m}")
    else:
        print("No shapes need manual attention.")

    if args.apply:
        written, changed = rewrite_modules(modules)
        print(f"Rewrote {written} module file(s); {changed} shapes changed.")
    else:
        print("Dry run only - rerun with --apply to write files.")
    return 1 if manual else 0


if __name__ == "__main__":
    raise SystemExit(main())
