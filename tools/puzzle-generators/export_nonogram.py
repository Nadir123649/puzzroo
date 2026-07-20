"""Export uniqueness-guaranteed Nonogram datasets to static JSON for the
Puzzroo frontend (no MongoDB required).

Writes one file per difficulty into the shared data directory:
    shared/src/data/nonogram/{easy,medium,hard,expert}.json
plus a `meta.json` manifest.

Each record:
    {
      "id": str,
      "title": str,
      "difficulty": "easy"|"medium"|"hard"|"expert",
      "size": int,
      "category": str,
      "estimatedTime": int,                       # seconds
      "sol": "<size*size char string of 0/1>",    # compact solution
      "rowClues": [[int, ...], ...],              # number[][]
      "columnClues": [[int, ...], ...],           # number[][]; empty line = []
      "_hash": str,
      "uniqueSolution": true,
      "fillDensity": float
    }

Strategy (hybrid):
  * EASY (10x10) and MEDIUM (15x15) lead with curated, recognizable pictures
    (tools/.../nonogram/pictures.py) that are verified uniquely solvable, then
    fill the remainder procedurally.
  * HARD (20x20) and EXPERT (25x25 + 30x30) are fully procedural.

Every puzzle is GUARANTEED unique by the generator's line-solver (which
completes to exactly one solution). Resumable: an existing file is loaded and
generation continues until the requested count is reached (deduplicated by
content hash).

Usage:
    py export_nonogram.py --difficulty all --count 1000
    py export_nonogram.py --difficulty expert --count 1000 --seed 42
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
from puzzlegen.nonogram.generator import build_one
from puzzlegen.nonogram.pictures import curated_puzzles

DEFAULT_OUT = Path(__file__).resolve().parent.parent.parent / "shared" / "src" / "data" / "nonogram"


def _sol_string(solution: list[list[int]]) -> str:
    return "".join(str(v) for row in solution for v in row)


def _clues_from(values_list: list[dict]) -> list[list[int]]:
    return [c["values"] for c in values_list]


def _nonogram_buckets():
    return [b for b in all_buckets() if b.game == "nonogram"]


def _buckets_for_difficulty(difficulty: str) -> list:
    return [b for b in _nonogram_buckets() if b.difficulty == difficulty]


def _per_bucket_targets(difficulty: str, count: int) -> list[tuple]:
    """Return [(bucket, cumulative_target)] spreading `count` across sizes.

    EXPERT (25+30) splits the count across its two sizes; each entry carries the
    *cumulative* target so the export loop fills up to it regardless of order.
    """
    buckets = _buckets_for_difficulty(difficulty)
    if not buckets:
        return []
    if len(buckets) == 1:
        return [(buckets[0], count)]
    base = count // len(buckets)
    cumulative = 0
    targets = []
    for i, b in enumerate(buckets):
        share = base + (count - base * len(buckets)) if i == 0 else base
        cumulative += share
        targets.append((b, cumulative))
    return targets


def _make_record(bucket, fields, h, title, category) -> dict:
    size = bucket.size
    solution = fields["solution"]
    return {
        "id": puzzle_id(bucket.game, bucket.size_label, bucket.difficulty, h),
        "title": title,
        "difficulty": bucket.difficulty,
        "size": size,
        "category": category,
        "estimatedTime": int(size * size * 3),
        "sol": _sol_string(solution),
        "rowClues": _clues_from(fields["rowClues"]),
        "columnClues": _clues_from(fields["columnClues"]),
        "_hash": h,
        "uniqueSolution": True,
        "fillDensity": round(bucket.params["density"], 3),
    }


def export_difficulty(difficulty: str, count: int, seed: int, out_dir: Path, overwrite: bool) -> int:
    rng = random.Random(seed)
    path = out_dir / f"{difficulty}.json"

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
    print(f"  [{difficulty}] target {count}, have {produced}", flush=True)

    # 1) Curated pictures for easy/medium (seeded first, deduped, unique-only).
    if difficulty in ("easy", "medium"):
        for pic in curated_puzzles():
            if produced >= count:
                break
            if pic["size"] != _buckets_for_difficulty(difficulty)[0].size:
                continue
            h = content_hash({"g": "nonogram", "s": pic["size"], "sol": pic["solution"]})
            if h in seen_hashes:
                continue
            seen_hashes.add(h)
            bucket = _buckets_for_difficulty(difficulty)[0]
            rec = {
                "id": puzzle_id(bucket.game, bucket.size_label, difficulty, h),
                "title": pic["title"],
                "difficulty": difficulty,
                "size": pic["size"],
                "category": pic["category"],
                "estimatedTime": int(pic["size"] * pic["size"] * 3),
                "sol": _sol_string(pic["solution"]),
                "rowClues": _clues_from(pic["rowClues"]),
                "columnClues": _clues_from(pic["columnClues"]),
                "_hash": h,
                "uniqueSolution": True,
                "fillDensity": round(bucket.params["density"], 3),
            }
            existing.append(rec)
            produced += 1

    # 2) Procedural fill for the remainder (and all of hard/expert).
    for bucket, cumulative_target in _per_bucket_targets(difficulty, count):
        attempts = 0
        max_attempts = max(2000, (cumulative_target - produced) * 80) if cumulative_target > produced else 0
        while produced < cumulative_target and attempts < max_attempts:
            attempts += 1
            fields, hash_payload = build_one(bucket, rng)
            if fields is None:
                continue
            h = content_hash(hash_payload)
            if h in seen_hashes:
                continue
            seen_hashes.add(h)
            title = f"Nonogram {bucket.size}x{bucket.size}"
            existing.append(_make_record(bucket, fields, h, title, "generated"))
            produced += 1

    out_dir.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(existing, separators=(",", ":")), encoding="utf-8")
    print(f"  [{difficulty}] wrote {produced} -> {path.name} "
          f"({sum(1 for r in existing if r.get('category') != 'generated')} curated)", flush=True)
    return produced


def main() -> int:
    ap = argparse.ArgumentParser(description="Export Nonogram datasets to static JSON.")
    ap.add_argument("--difficulty", choices=[*DIFFICULTIES, "all"], default="all")
    ap.add_argument("--count", type=int, default=1000, help="target puzzles per difficulty")
    ap.add_argument("--seed", type=int, default=1337)
    ap.add_argument("--out", type=str, default=str(DEFAULT_OUT))
    ap.add_argument("--overwrite", action="store_true", help="ignore existing files")
    args = ap.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    difficulties = DIFFICULTIES if args.difficulty == "all" else [args.difficulty]
    totals: dict[str, int] = {}
    sizes_by_diff: dict[str, list[int]] = {}
    for i, diff in enumerate(difficulties):
        seed = args.seed + i * 1009
        totals[diff] = export_difficulty(diff, args.count, seed, out_dir, args.overwrite)
        sizes_by_diff[diff] = [b.size for b in _buckets_for_difficulty(diff)]

    meta = {
        "game": "nonogram",
        "generatorVersion": GENERATOR_VERSION,
        "difficulties": list(totals.keys()),
        "counts": totals,
        "sizesByDifficulty": sizes_by_diff,
        "encoding": "sol is a size*size string of '0'/'1' (row-major); "
                    "rowClues/columnClues are number[][]; empty line is []; "
                    "every puzzle has a unique solution (line-solver verified).",
    }
    (out_dir / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print("meta.json written:", json.dumps(totals))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
