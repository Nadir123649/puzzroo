"""Export technique-rated, uniqueness-guaranteed Sudoku datasets to static
JSON for the Puzzroo frontend (no MongoDB required).

Writes one file per difficulty into the shared data directory:
    shared/src/data/sudoku/{easy,medium,hard,expert}.json
plus a `meta.json` manifest.

Each record:
    {
      "id": str,
      "difficulty": "easy"|"medium"|"hard"|"expert",
      "puzzle": "81-char string (0 = empty)",
      "solution": "81-char string",
      "givens": int,
      "tier": int,            # technique tier 1-4
      "techniques": [str],    # techniques the rater fired
      "solvableByLogic": bool
    }

Usage:
    py export_sudoku.py --difficulty all --count 1000
    py export_sudoku.py --difficulty expert --count 1000 --seed 42

Resumable: an existing file is loaded and generation continues until the
requested count is reached (deduplicated by content hash).
"""
from __future__ import annotations

import argparse
import json
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from puzzlegen import GENERATOR_VERSION
from puzzlegen.common.config import all_buckets, DIFFICULTIES
from puzzlegen.common.hashing import content_hash, puzzle_id
from puzzlegen.sudoku.generator import build_one
from puzzlegen.sudoku.solver import has_unique_solution

DEFAULT_OUT = Path(__file__).resolve().parent.parent.parent / "shared" / "src" / "data" / "sudoku"


def _encode(board: list[list[int]]) -> str:
    return "".join(str(v) for row in board for v in row)


def _difficulty_buckets(difficulty: str | None):
    buckets = [b for b in all_buckets() if b.game == "sudoku"]
    if difficulty and difficulty != "all":
        buckets = [b for b in buckets if b.difficulty == difficulty]
    return buckets


def export_difficulty(bucket, count: int, seed: int, out_dir: Path, overwrite: bool) -> int:
    rng = random.Random(seed)
    path = out_dir / f"{bucket.difficulty}.json"

    existing: list[dict] = []
    seen_hashes: set[str] = set()
    if path.exists() and not overwrite:
        try:
            existing = json.loads(path.read_text(encoding="utf-8"))
            for rec in existing:
                seen_hashes.add(rec.get("_hash"))
        except Exception:
            existing = []

    produced = len(existing)
    attempts = 0
    max_attempts = max(500, count * 60)

    print(f"  [{bucket.difficulty}] target {count}, have {produced}", flush=True)
    while produced < count and attempts < max_attempts:
        attempts += 1
        fields, hash_payload = build_one(bucket, rng)
        if fields is None:
            continue
        h = content_hash(hash_payload)
        if h in seen_hashes:
            continue
        seen_hashes.add(h)

        # Safety: never ship a non-unique puzzle.
        if not has_unique_solution(fields["puzzle"], bucket.size):
            continue

        pid = puzzle_id(bucket.game, bucket.size_label, bucket.difficulty, h)
        rec = {
            "id": pid,
            "difficulty": bucket.difficulty,
            "puzzle": _encode(fields["puzzle"]),
            "solution": _encode(fields["solution"]),
            "givens": fields["givens"],
            "tier": fields["tier"],
            "techniques": fields["techniques"],
            "solvableByLogic": fields["solvableByLogic"],
            "_hash": h,
        }
        existing.append(rec)
        produced += 1

    # Persist (strip internal _hash from public records? keep it; harmless).
    out_dir.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(existing, separators=(",", ":")), encoding="utf-8")
    print(f"  [{bucket.difficulty}] wrote {produced} -> {path.name} ({attempts} attempts)", flush=True)
    return produced


def main() -> int:
    ap = argparse.ArgumentParser(description="Export Sudoku datasets to static JSON.")
    ap.add_argument("--difficulty", choices=[*DIFFICULTIES, "all"], default="all")
    ap.add_argument("--count", type=int, default=1000, help="target puzzles per difficulty")
    ap.add_argument("--seed", type=int, default=1337)
    ap.add_argument("--out", type=str, default=str(DEFAULT_OUT))
    ap.add_argument("--overwrite", action="store_true", help="ignore existing files")
    args = ap.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    buckets = _difficulty_buckets(args.difficulty)
    totals = {}
    for i, b in enumerate(buckets):
        seed = args.seed + i * 1009
        totals[b.difficulty] = export_difficulty(b, args.count, seed, out_dir, args.overwrite)

    meta = {
        "game": "sudoku",
        "generatorVersion": GENERATOR_VERSION,
        "size": 9,
        "difficulties": list(totals.keys()),
        "counts": totals,
        "encoding": "puzzle/solution are 81-char strings, 0 = empty cell",
    }
    (out_dir / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print("meta.json written:", json.dumps(totals))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
