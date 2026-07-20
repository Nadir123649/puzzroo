"""Export uniqueness-guaranteed CrossMath datasets to static JSON for the
Puzzroo frontend (no MongoDB required).

Writes one compact file per difficulty into the shared data directory:
    shared/src/data/crossmath/{easy,medium,hard}.json
plus a `meta.json` manifest. Records are reconstructed at runtime by the
frontend via patterns.ts (only solution + blanks are stored).

Each record:
    {
      "id": str,
      "difficulty": "easy"|"medium"|"hard",
      "patternId": int,
      "solution": { "r-c": int, ... },   # full solution incl. result cells
      "blanks": ["r-c", ...],            # editable operand cells
      "availableNumbers": [int, ...],
      "maxMistakes": int,
      "_hash": str
    }

Usage:
    py export_crossmath.py --difficulty all --count 1000
    py export_crossmath.py --difficulty hard --count 1000 --seed 42

Parallelized across CPU cores. Resumable: an existing file is loaded and
generation continues until the requested count is reached (deduplicated by
content hash).
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
from puzzlegen.crossmath.generator import build_one
from puzzlegen.crossmath.patterns import patterns_for

DEFAULT_OUT = Path(__file__).resolve().parent.parent.parent / "shared" / "src" / "data" / "crossmath"


def _bucket_for(difficulty: str):
    return [b for b in all_buckets() if b.game == "crossmath" and b.difficulty == difficulty][0]


def _generate_one(args):
    """Worker: produce one puzzle record or None. Picklable args tuple."""
    difficulty, pattern_idx, seed = args
    bucket = _bucket_for(difficulty)
    rng = random.Random(seed)
    fields, hash_payload = build_one(bucket, rng, pattern_idx=pattern_idx)
    if fields is None:
        return None
    h = content_hash(hash_payload)
    rec = {
        "id": puzzle_id(bucket.game, bucket.size_label, bucket.difficulty, h),
        "difficulty": fields["difficulty"],
        "patternId": fields["patternId"],
        "solution": fields["solution"],
        "blanks": fields["blanks"],
        "availableNumbers": fields["availableNumbers"],
        "maxMistakes": fields["maxMistakes"],
        "_hash": h,
    }
    return rec


def export_difficulty(difficulty: str, count: int, seed: int, out_dir: Path, overwrite: bool,
                      processes: int) -> int:
    from multiprocessing import Pool

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
    if produced >= count:
        print(f"  [{difficulty}] already have {produced} >= {count}, skipping", flush=True)
        return produced

    n_patterns = len(patterns_for(difficulty))
    print(f"  [{difficulty}] target {count}, have {produced}, patterns={n_patterns}, procs={processes}",
          flush=True)

    # Build a task stream: round-robin patterns, unique seeds. Over-generate a
    # bit to absorb None (unbuildable) returns and hash collisions.
    tasks = []
    i = 0
    while len(tasks) < (count - produced) * 3 and len(tasks) < 60000:
        tasks.append((difficulty, i % n_patterns, seed + i * 101))
        i += 1

    out_dir.mkdir(parents=True, exist_ok=True)
    flush_every = 25

    with Pool(processes=processes) as pool:
        for rec in pool.imap_unordered(_generate_one, tasks):
            if rec is None:
                continue
            if rec["_hash"] in seen_hashes:
                continue
            seen_hashes.add(rec["_hash"])
            existing.append(rec)
            produced += 1
            if produced % 100 == 0:
                print(f"    [{difficulty}] {produced}/{count}", flush=True)
            # Incremental flush so partial progress survives an external kill.
            if produced % flush_every == 0 or produced >= count:
                path.write_text(json.dumps(existing, separators=(",", ":")), encoding="utf-8")
            if produced >= count:
                break

    path.write_text(json.dumps(existing, separators=(",", ":")), encoding="utf-8")
    print(f"  [{difficulty}] wrote {produced} -> {path.name}", flush=True)
    return produced


def main() -> int:
    ap = argparse.ArgumentParser(description="Export CrossMath datasets to static JSON.")
    ap.add_argument("--difficulty", choices=[*DIFFICULTIES, "all"], default="all")
    ap.add_argument("--count", type=int, default=1000, help="target puzzles per difficulty")
    ap.add_argument("--seed", type=int, default=1337)
    ap.add_argument("--out", type=str, default=str(DEFAULT_OUT))
    ap.add_argument("--overwrite", action="store_true", help="ignore existing files")
    ap.add_argument("--processes", type=int, default=0, help="0 = all CPU cores")
    args = ap.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    import os
    processes = args.processes if args.processes > 0 else max(1, (os.cpu_count() or 4) - 1)

    diffs = [args.difficulty] if args.difficulty != "all" else ["easy", "medium", "hard"]
    totals = {}
    for i, diff in enumerate(diffs):
        seed = args.seed + i * 1009
        totals[diff] = export_difficulty(diff, args.count, seed, out_dir, args.overwrite, processes)

    meta = {
        "game": "crossmath",
        "generatorVersion": GENERATOR_VERSION,
        "difficulties": list(totals.keys()),
        "counts": totals,
        "encoding": "compact: solution (full) + blanks; grid reconstructed via patterns.ts",
    }
    (out_dir / "meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")
    print("meta.json written:", json.dumps(totals))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
