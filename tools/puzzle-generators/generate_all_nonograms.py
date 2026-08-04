"""Generate complete Nonogram datasets with correct pixel-art shapes.

Reads shape definitions from nonogram_shapes/ sub-modules, scales them to each
difficulty's grid size, generates variants via transformations, validates each
puzzle with the line solver, and writes the final JSON dataset files.

Usage:
    cd tools/puzzle-generators
    python generate_all_nonograms.py
    python generate_all_nonograms.py --difficulty easy --count 1000
"""
from __future__ import annotations

import argparse
import hashlib
import json
import random
import sys
import time
from pathlib import Path

# Add project paths
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from puzzlegen.nonogram.line_solver import clue_from_line, is_line_solvable
from nonogram_shapes import collect_all_shapes

# ── Configuration ────────────────────────────────────────────────────────────
DEFAULT_OUT = HERE.parent.parent / "shared" / "src" / "data" / "nonogram"
DIFFICULTIES = ("easy", "medium", "hard")

DIFFICULTY_CONFIG = {
    "easy":   {"sizes": [5], "density": 0.55, "target": 1000},
    "medium": {"sizes": [10], "density": 0.60, "target": 1000},
    "hard":   {"sizes": [15], "density": 0.64, "target": 1000},
}


# ── Drawing / Scaling Utilities ──────────────────────────────────────────────

def scale_grid(grid_10: list[list[int]], target_size: int) -> list[list[int]]:
    """Scale a 10x10 grid to target_size x target_size using nearest-neighbor
    with edge smoothing for better nonogram solvability."""
    src_size = len(grid_10)
    result = [[0] * target_size for _ in range(target_size)]

    for r in range(target_size):
        for c in range(target_size):
            # Map target coords back to source coords
            sr = int(r * src_size / target_size)
            sc = int(c * src_size / target_size)
            sr = min(sr, src_size - 1)
            sc = min(sc, src_size - 1)
            result[r][c] = grid_10[sr][sc]

    # Smooth edges: for border cells, use 2x2 block voting
    smoothed = [row[:] for row in result]
    for r in range(target_size):
        for c in range(target_size):
            neighbors = []
            for dr in (-1, 0, 1):
                for dc in (-1, 0, 1):
                    nr, nc = r + dr, c + dc
                    if 0 <= nr < target_size and 0 <= nc < target_size:
                        neighbors.append(result[nr][nc])
            # Only smooth if this cell is an outlier among its neighbors
            fill_count = sum(neighbors)
            total = len(neighbors)
            if result[r][c] == 1 and fill_count <= 2:
                smoothed[r][c] = 0
            elif result[r][c] == 0 and fill_count >= total - 2:
                smoothed[r][c] = 1

    # Ensure no fully empty rows/columns
    for r in range(target_size):
        if not any(smoothed[r]):
            smoothed[r][target_size // 2] = 1
    for c in range(target_size):
        if not any(smoothed[r][c] for r in range(target_size)):
            smoothed[target_size // 2][c] = 1

    return smoothed


def parse_grid(grid_strings: list[str]) -> list[list[int]]:
    """Convert list of '0'/'1' strings to 2D int grid."""
    return [[int(ch) for ch in row] for row in grid_strings]


# ── Variant Generation ───────────────────────────────────────────────────────

def flip_horizontal(grid: list[list[int]]) -> list[list[int]]:
    """Mirror left-to-right."""
    return [row[::-1] for row in grid]


def flip_vertical(grid: list[list[int]]) -> list[list[int]]:
    """Mirror top-to-bottom."""
    return grid[::-1]


def rotate_180(grid: list[list[int]]) -> list[list[int]]:
    """Rotate 180 degrees."""
    return [row[::-1] for row in grid[::-1]]


def shift_grid(grid: list[list[int]], dr: int, dc: int) -> list[list[int]]:
    """Shift grid by (dr, dc) pixels, filling empty space with 0."""
    size = len(grid)
    result = [[0] * size for _ in range(size)]
    for r in range(size):
        for c in range(size):
            nr, nc = r + dr, c + dc
            if 0 <= nr < size and 0 <= nc < size:
                result[nr][nc] = grid[r][c]
    return result


def perturb_grid(grid: list[list[int]], rng: random.Random, n_changes: int = 3) -> list[list[int]]:
    """Randomly flip n_changes cells while keeping the shape recognizable."""
    size = len(grid)
    result = [row[:] for row in grid]
    for _ in range(n_changes):
        r = rng.randrange(size)
        c = rng.randrange(size)
        result[r][c] = 1 - result[r][c]

    # Ensure no fully empty rows/columns
    for r in range(size):
        if not any(result[r]):
            result[r][rng.randrange(size)] = 1
    for c in range(size):
        if not any(result[r][c] for r in range(size)):
            result[rng.randrange(size)][c] = 1

    return result


def generate_variants(base_grid: list[list[int]], rng: random.Random,
                      max_variants: int = 20) -> list[list[list[int]]]:
    """Generate multiple variants of a base grid through transformations."""
    variants = [base_grid]  # Original

    # Geometric transformations
    transforms = [
        flip_horizontal,
        flip_vertical,
        rotate_180,
    ]
    for transform in transforms:
        v = transform(base_grid)
        if v != base_grid:
            variants.append(v)

    # Small shifts
    for dr in (-1, 0, 1):
        for dc in (-1, 0, 1):
            if dr == 0 and dc == 0:
                continue
            v = shift_grid(base_grid, dr, dc)
            if v != base_grid:
                variants.append(v)

    # Perturbations (random small changes)
    while len(variants) < max_variants:
        n_changes = rng.randint(2, 5)
        v = perturb_grid(base_grid, rng, n_changes)
        if v not in variants:
            variants.append(v)

    return variants[:max_variants]


# ── Hashing & ID Generation ─────────────────────────────────────────────────

def content_hash(grid: list[list[int]], size: int) -> str:
    """SHA-256 hash of a solution grid."""
    sol_str = "".join(str(v) for row in grid for v in row)
    payload = f"nonogram:{size}:{sol_str}"
    return hashlib.sha256(payload.encode()).hexdigest()


def puzzle_id(size: int, difficulty: str, h: str) -> str:
    """Generate a unique puzzle ID."""
    return f"nonogram-{size}x{size}-{difficulty}-{h[:8]}"


def sol_string(grid: list[list[int]]) -> str:
    """Convert grid to compact solution string."""
    return "".join(str(v) for row in grid for v in row)


# ── Puzzle Assembly ──────────────────────────────────────────────────────────

def make_puzzle_record(grid: list[list[int]], size: int, difficulty: str,
                       title: str, category: str, density: float) -> dict | None:
    """Create a complete puzzle record from a validated grid."""
    h = content_hash(grid, size)
    row_clues = [clue_from_line(grid[r]) for r in range(size)]
    col_clues = [clue_from_line([grid[r][c] for r in range(size)]) for c in range(size)]

    return {
        "id": puzzle_id(size, difficulty, h),
        "title": title,
        "difficulty": difficulty,
        "size": size,
        "category": category,
        "estimatedTime": int(size * size * 3),
        "sol": sol_string(grid),
        "rowClues": row_clues,
        "columnClues": col_clues,
        "_hash": h,
        "uniqueSolution": True,
        "fillDensity": round(density, 3),
    }


# ── Main Generation Logic ───────────────────────────────────────────────────

def generate_difficulty(difficulty: str, target_count: int, shapes: dict,
                        seed: int) -> list[dict]:
    """Generate puzzles for a single difficulty level."""
    config = DIFFICULTY_CONFIG[difficulty]
    sizes = config["sizes"]
    density = config["density"]
    rng = random.Random(seed)

    puzzles: list[dict] = []
    seen_hashes: set[str] = set()
    shape_names = list(shapes.keys())
    rng.shuffle(shape_names)  # spread titles across all categories

    print(f"\n[{difficulty}] Generating {target_count} puzzles (sizes: {sizes})...", flush=True)

    size_targets = [(sizes[0], target_count)]

    for target_size, size_count in size_targets:
        size_produced = 0
        shape_idx = 0
        attempts = 0
        max_attempts = size_count * 50  # generous retry limit

        print(f"  [{difficulty}/{target_size}x{target_size}] target: {size_count}", flush=True)

        while size_produced < size_count and attempts < max_attempts:
            # Cycle through shapes
            shape_name = shape_names[shape_idx % len(shape_names)]
            shape_data = shapes[shape_name]
            category = shape_data["category"]
            base_grid_10 = parse_grid(shape_data["grid"])

            # Scale to target size
            if target_size == 10:
                base_grid = base_grid_10
            else:
                base_grid = scale_grid(base_grid_10, target_size)

            # Generate variants
            variants = generate_variants(base_grid, rng, max_variants=15)

            for variant in variants:
                if size_produced >= size_count:
                    break

                attempts += 1

                # Check line solvability
                if not is_line_solvable(variant):
                    continue

                # Check for duplicate solutions
                h = content_hash(variant, target_size)
                if h in seen_hashes:
                    continue
                seen_hashes.add(h)

                # Create puzzle record
                record = make_puzzle_record(variant, target_size, difficulty,
                                           shape_name, category, density)
                if record:
                    puzzles.append(record)
                    size_produced += 1

                    if size_produced % 50 == 0:
                        print(f"    [{difficulty}/{target_size}x{target_size}] "
                              f"{size_produced}/{size_count} puzzles generated "
                              f"({attempts} attempts)", flush=True)

            shape_idx += 1

            # If we've cycled through all shapes and still need more,
            # use heavier perturbation on random shapes
            if shape_idx >= len(shape_names) and size_produced < size_count:
                shape_idx = 0
                # Increase perturbation for the next cycle
                for _ in range(min(20, size_count - size_produced)):
                    if size_produced >= size_count:
                        break
                    attempts += 1

                    rand_name = rng.choice(shape_names)
                    rand_data = shapes[rand_name]
                    base_10 = parse_grid(rand_data["grid"])

                    if target_size == 10:
                        base = base_10
                    else:
                        base = scale_grid(base_10, target_size)

                    variant = perturb_grid(base, rng, n_changes=rng.randint(3, 8))

                    if not is_line_solvable(variant):
                        continue
                    h = content_hash(variant, target_size)
                    if h in seen_hashes:
                        continue
                    seen_hashes.add(h)

                    record = make_puzzle_record(variant, target_size, difficulty,
                                               rand_name, rand_data["category"],
                                               density)
                    if record:
                        puzzles.append(record)
                        size_produced += 1

        print(f"  [{difficulty}/{target_size}x{target_size}] DONE: {size_produced} puzzles "
              f"({attempts} attempts)", flush=True)

    print(f"[{difficulty}] Total: {len(puzzles)} puzzles", flush=True)
    return puzzles


def write_dataset(puzzles: list[dict], difficulty: str, out_dir: Path):
    """Write puzzles to JSON file."""
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / f"{difficulty}.json"
    path.write_text(json.dumps(puzzles, separators=(",", ":")), encoding="utf-8")
    print(f"  Wrote {len(puzzles)} puzzles -> {path}", flush=True)


def write_meta(counts: dict, out_dir: Path):
    """Write meta.json manifest."""
    meta = {
        "game": "nonogram",
        "generatorVersion": 2,
        "difficulties": list(counts.keys()),
        "counts": counts,
        "sizesByDifficulty": {
            "easy": [5],
            "medium": [10],
            "hard": [15],
        },
        "encoding": (
            "sol is a size*size string of '0'/'1' (row-major); "
            "rowClues/columnClues are number[][]; empty line is []; "
            "every puzzle has a unique solution (line-solver verified). "
            "All puzzles feature recognizable pixel-art shapes matching their title."
        ),
    }
    path = out_dir / "meta.json"
    path.write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print(f"  Wrote meta.json", flush=True)


def main() -> int:
    ap = argparse.ArgumentParser(description="Generate Nonogram datasets with correct shapes.")
    ap.add_argument("--difficulty", choices=[*DIFFICULTIES, "all"], default="all")
    ap.add_argument("--count", type=int, default=1000,
                    help="target puzzles per difficulty")
    ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--out", type=str, default=str(DEFAULT_OUT))
    args = ap.parse_args()

    out_dir = Path(args.out)

    # Load all shape definitions
    print("Loading shape definitions...", flush=True)
    shapes = collect_all_shapes()
    print(f"Loaded {len(shapes)} unique shapes", flush=True)

    if len(shapes) == 0:
        print("ERROR: No shapes loaded! Check nonogram_shapes/ modules.", file=sys.stderr)
        return 1

    difficulties = DIFFICULTIES if args.difficulty == "all" else (args.difficulty,)
    counts: dict[str, int] = {}

    start_time = time.time()

    for i, diff in enumerate(difficulties):
        seed = args.seed + i * 1009
        target = args.count
        puzzles = generate_difficulty(diff, target, shapes, seed)
        write_dataset(puzzles, diff, out_dir)
        counts[diff] = len(puzzles)

    write_meta(counts, out_dir)

    elapsed = time.time() - start_time
    print(f"\nGeneration complete in {elapsed:.1f}s")
    print(f"Counts: {json.dumps(counts)}")

    # Summary
    total = sum(counts.values())
    print(f"Total puzzles generated: {total}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
