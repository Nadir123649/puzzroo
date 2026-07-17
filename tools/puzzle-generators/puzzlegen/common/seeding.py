"""Bucket seeding: generate → dedup by hash → upsert into Mongo (or dry-run)."""
from __future__ import annotations

import random
from datetime import datetime, timezone

from tqdm import tqdm

from puzzlegen import GENERATOR_VERSION
from puzzlegen.common.config import Bucket
from puzzlegen.common.hashing import content_hash, puzzle_id


def _get_builder(game: str):
    """Return the per-game builder: (bucket, rng) -> (fields, hash_payload)."""
    if game == "sudoku":
        from puzzlegen.sudoku.generator import build_one
    elif game == "crossmath":
        from puzzlegen.crossmath.generator import build_one
    elif game == "nonogram":
        from puzzlegen.nonogram.generator import build_one
    else:
        raise ValueError(f"unknown game: {game}")
    return build_one


class BucketResult:
    def __init__(self, bucket: Bucket):
        self.bucket = bucket
        self.produced = 0        # new puzzles written this run
        self.existing = 0        # already in DB before this run
        self.target = 0
        self.attempts = 0
        self.shortfall = 0

    @property
    def total(self) -> int:
        return self.existing + self.produced


def seed_bucket(
    bucket: Bucket,
    count: int,
    *,
    reset: bool = False,
    dry_run: bool = False,
    seed: int | None = None,
    mongo_uri: str | None = None,
) -> BucketResult:
    build_one = _get_builder(bucket.game)
    rng = random.Random(seed)
    result = BucketResult(bucket)
    result.target = count

    coll = None
    scope = {"difficulty": bucket.difficulty, "size": bucket.size}
    if not dry_run:
        from puzzlegen.common.db import get_collection
        coll = get_collection(bucket.game, mongo_uri)
        if reset:
            coll.delete_many(scope)
        result.existing = coll.count_documents(scope)

    need = max(0, count - result.existing)
    seen_hashes: set[str] = set()

    # Attempt cap so a hard bucket can never hang forever.
    max_attempts = max(200, need * 40)

    label = f"{bucket.game} {bucket.size_label} {bucket.difficulty}"
    with tqdm(total=need, desc=label, unit="puz", leave=False) as bar:
        while result.produced < need and result.attempts < max_attempts:
            result.attempts += 1
            try:
                fields, hash_payload = build_one(bucket, rng)
            except Exception:
                continue
            if fields is None:
                continue

            h = content_hash(hash_payload)
            if h in seen_hashes:
                continue
            seen_hashes.add(h)

            pid = puzzle_id(bucket.game, bucket.size_label, bucket.difficulty, h)
            doc = {
                **fields,
                "puzzleId": pid,
                "game": bucket.game,
                "difficulty": bucket.difficulty,
                "size": bucket.size,
                "hash": h,
                "generatorVersion": GENERATOR_VERSION,
                "createdAt": datetime.now(timezone.utc),
            }

            if dry_run:
                result.produced += 1
                bar.update(1)
                continue

            res = coll.update_one({"hash": h}, {"$setOnInsert": doc}, upsert=True)
            if res.upserted_id is not None:
                result.produced += 1
                bar.update(1)
            # else: duplicate already in DB (top-up hit an existing) — keep trying.

    result.shortfall = need - result.produced
    return result
