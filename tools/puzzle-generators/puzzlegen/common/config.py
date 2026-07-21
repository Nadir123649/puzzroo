"""Static configuration: buckets, difficulty parameters, defaults.

A *bucket* is one (game, difficulty, size) combination we generate puzzles for.
"""
from __future__ import annotations

from dataclasses import dataclass, field

DEFAULT_COUNT = 100
DIFFICULTIES = ("easy", "medium", "hard", "expert")

# Sudoku difficulty -> EXPECTED technique tier (see puzzlegen/sudoku/rating.py).
# Used only as a labelling/validation reference, not as a strict gate (see note
# on difficulty below).
#   1 easy   : naked/hidden singles
#   2 medium : + pairs, pointing, box-line reduction
#   3 hard   : + triples, X-Wing, XY/XYZ-Wing
#   4 expert : + swordfish, coloring, or requires brute force
SUDOKU_TIERS = {"easy": 1, "medium": 2, "hard": 3, "expert": 4}


@dataclass(frozen=True)
class Bucket:
    game: str
    difficulty: str
    size: int          # sudoku: 9 (Puzzroo frontend is 9x9 only)
    size_label: str    # e.g. "9x9"
    params: dict = field(default_factory=dict)


# ── Sudoku: 9x9 only (the Puzzroo frontend renders a single 9x9 board). ───────
# Difficulty is determined by the GIVENS BAND (clue count), which is the
# industry-standard lever for Sudoku difficulty and reliably yields balanced,
# high-volume datasets. Every puzzle is additionally GUARANTEED to have a
# unique solution (solver) and is TECHNIQUE-RATED (rating.py) so each record
# carries a `tier` + `techniques` tag for UI hints/analytics. A puzzle is
# rejected only if its rated tier is more than one above the band's expected
# tier (i.e. grossly mislabelled as too easy).
#   givens = (min, max) pre-filled cells kept.
SUDOKU_GIVENS = {
    9: {
        "easy": (38, 45),
        "medium": (30, 37),
        "hard": (25, 32),
        "expert": (22, 28),
    },
}

# ── CrossMath: pattern-shaped boards (see puzzlegen/crossmath/patterns.py). ──
# Difficulty is set by the PATTERN BAND (easy/medium/hard patterns) combined with
# the BLANK RATIO of inner operand cells that are made editable:
#   easy ~45%, medium ~60%, hard ~75%.
# Every puzzle is GUARANTEED to have a unique solution (pattern-aware solver:
# given the shown operators + result cells, exactly one fill of the blanks).
CROSSMATH_BLANK_RATIO = {"easy": 0.45, "medium": 0.60, "hard": 0.60}
CROSSMATH_MAX_MISTAKES = {"easy": 5, "medium": 4, "hard": 3}
# Result-cell cap for parity with the app's solvePattern (caps at 30).
CROSSMATH_MAX_RESULT = 30

# ── Nonogram: difficulty → list of sizes. Density = target fill ratio. ───────
# Densities chosen so every size reliably yields UNIQUE, fully line-solvable
# puzzles (no guessing). Large grids need higher fill because line-solving
# relies on overlap deductions from large blocks; difficulty comes from size.
#   easy   -> 10x10   (recognizable curated pictures + procedural fill)
#   medium -> 15x15   (recognizable curated pictures + procedural fill)
#   hard   -> 20x20   (procedural, large board)
#   expert -> 25x25 + 30x30 (procedural, industry-standard largest boards)
NONOGRAM_SIZES = {"easy": [10], "medium": [15], "hard": [20], "expert": [25, 30]}
NONOGRAM_DENSITY = {"easy": 0.55, "medium": 0.60, "hard": 0.64, "expert": 0.66}


def all_buckets() -> list[Bucket]:
    buckets: list[Bucket] = []

    for size in SUDOKU_GIVENS:
        for diff in DIFFICULTIES:
            lo, hi = SUDOKU_GIVENS[size][diff]
            buckets.append(Bucket(
                game="sudoku", difficulty=diff, size=size,
                size_label=f"{size}x{size}",
                params={"givens_min": lo, "givens_max": hi},
            ))

    for diff in ("easy", "medium", "hard"):
        # size_label = grid side (7 for easy, 11 for medium/hard).
        side = 7 if diff == "easy" else 11
        buckets.append(Bucket(
            game="crossmath", difficulty=diff, size=side,
            size_label=f"{side}x{side}",
            params={
                "blank_ratio": CROSSMATH_BLANK_RATIO[diff],
                "max_mistakes": CROSSMATH_MAX_MISTAKES[diff],
                "max_result": CROSSMATH_MAX_RESULT,
            },
        ))

    for diff in DIFFICULTIES:
        for size in NONOGRAM_SIZES[diff]:
            buckets.append(Bucket(
                game="nonogram", difficulty=diff, size=size,
                size_label=f"{size}x{size}",
                params={"density": NONOGRAM_DENSITY[diff]},
            ))

    return buckets


def buckets_for(game: str | None, difficulty: str | None, size: int | None) -> list[Bucket]:
    """Filter the full bucket list by optional game / difficulty / size."""
    result = []
    for b in all_buckets():
        if game and game != "all" and b.game != game:
            continue
        if difficulty and difficulty != "all" and b.difficulty != difficulty:
            continue
        if size is not None and b.size != size:
            continue
        result.append(b)
    return result
