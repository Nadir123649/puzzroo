"""Content hashing + deterministic puzzle ids."""
from __future__ import annotations

import hashlib
import json


def content_hash(payload: dict) -> str:
    """Stable SHA-256 over the canonical JSON of a puzzle's defining content.

    `payload` should contain only the fields that define the puzzle uniquely
    (e.g. the puzzle + solution), never volatile metadata like timestamps.
    """
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def puzzle_id(game: str, size_label: str, difficulty: str, h: str) -> str:
    return f"{game}-{size_label}-{difficulty}-{h[:8]}"
