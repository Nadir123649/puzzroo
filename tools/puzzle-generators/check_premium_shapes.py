"""Premium shape library QA — validates nonogram_shapes_premium modules.

Checks per shape:
  * 10 rows x 10 chars, only '0'/'1'
  * fill density within the Easy band (0.20 - 0.35) so every authored shape
    can survive the generator's density gate
  * at least 4 filled cells
  * filled cells form a single 8-way connected component (no stray cells)
  * bounding box covers >= 40% of the 10x10 area (substantial, not a dot)
  * unique names; unique grids across the whole library
  * non-empty human-readable name

Usage:
    py check_premium_shapes.py            # exit 1 on any failure
    py check_premium_shapes.py --preview  # print ASCII art for all shapes
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from nonogram_shapes_premium import collect_all_shapes

SIZE = 10
MIN_FILLED = 4
MIN_BBOX_COVERAGE = 0.40
MIN_DENSITY = 0.15
MAX_DENSITY = 0.55


def connected(grid: list[list[int]]) -> bool:
    """8-way connectivity of filled cells (single component)."""
    seen: set[tuple[int, int]] = set()
    starts = [(r, c) for r in range(SIZE) for c in range(SIZE) if grid[r][c]]
    if not starts:
        return False
    stack = [starts[0]]
    seen.add(starts[0])
    while stack:
        r, c = stack.pop()
        for dr in (-1, 0, 1):
            for dc in (-1, 0, 1):
                nr, nc = r + dr, c + dc
                if 0 <= nr < SIZE and 0 <= nc < SIZE and (nr, nc) not in seen and grid[nr][nc]:
                    seen.add((nr, nc))
                    stack.append((nr, nc))
    return len(seen) == len(starts)


def bbox_coverage(grid: list[list[int]]) -> float:
    rows = [r for r in range(SIZE) if any(grid[r])]
    if not rows:
        return 0.0
    cols = [c for c in range(SIZE) if any(grid[r][c] for r in range(SIZE))]
    return (max(rows) - min(rows) + 1) * (max(cols) - min(cols) + 1) / (SIZE * SIZE)


def parse_grid(strings: list[str]) -> list[list[int]] | None:
    if len(strings) != SIZE:
        return None
    out = []
    for row in strings:
        if len(row) != SIZE or any(ch not in "01" for ch in row):
            return None
        out.append([int(ch) for ch in row])
    return out


def ascii_art(grid: list[list[int]]) -> str:
    return "\n".join("".join("#" if v else "." for v in row) for row in grid)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--preview", action="store_true")
    args = ap.parse_args()

    shapes = collect_all_shapes()
    print(f"Loaded {len(shapes)} shapes")

    errors: list[str] = []
    seen_grids: dict[str, str] = {}
    seen_names: set[str] = set()

    for name, data in shapes.items():
        ctx = f"{name} ({data['category']})"
        if not isinstance(name, str) or not name.strip():
            errors.append(f"{ctx}: empty name")
            continue
        if name in seen_names:
            errors.append(f"{ctx}: duplicate name")
        seen_names.add(name)

        if "category" not in data:
            errors.append(f"{ctx}: missing category")
        if "grid" not in data or not isinstance(data["grid"], list):
            errors.append(f"{ctx}: missing grid")
            continue

        grid = parse_grid(data["grid"])
        if grid is None:
            errors.append(f"{ctx}: malformed grid (need 10 rows x 10 chars of 0/1)")
            continue

        filled = sum(sum(row) for row in grid)
        if filled < MIN_FILLED:
            errors.append(f"{ctx}: only {filled} filled cells (min {MIN_FILLED})")

        density = filled / (SIZE * SIZE)
        if density < MIN_DENSITY or density > MAX_DENSITY:
            errors.append(
                f"{ctx}: density {density:.3f} outside Easy band "
                f"[{MIN_DENSITY}, {MAX_DENSITY}]"
            )

        if not connected(grid):
            errors.append(f"{ctx}: filled cells are not a single connected component")

        cov = bbox_coverage(grid)
        if cov < MIN_BBOX_COVERAGE:
            errors.append(f"{ctx}: bbox coverage {cov:.2f} < {MIN_BBOX_COVERAGE}")

        key = "".join("".join(str(v) for v in row) for row in grid)
        if key in seen_grids:
            errors.append(f"{ctx}: duplicate grid of {seen_grids[key]}")
        seen_grids[key] = name

        if args.preview:
            print(f"\n=== {name} [{data['category']}] ===")
            print(ascii_art(grid))

    counts: dict[str, int] = {}
    for data in shapes.values():
        counts[data["category"]] = counts.get(data["category"], 0) + 1

    print("\nCategory distribution:")
    for cat, n in sorted(counts.items()):
        print(f"  {cat}: {n}")

    if errors:
        print(f"\n{len(errors)} QA failure(s):")
        for e in errors:
            print(f"  [FAIL] {e}")
        return 1

    print(f"\nAll {len(shapes)} premium shapes passed QA.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
