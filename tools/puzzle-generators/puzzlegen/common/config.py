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

# ── CrossMath: difficulty → operand grid dimension N. ────────────────────────
CROSSMATH_N = {"easy": 2, "medium": 3, "hard": 6}
# how many operand cells to blank (make editable), by difficulty.
CROSSMATH_BLANKS = {"easy": 2, "medium": 5, "hard": 12}
CROSSMATH_MAX_MISTAKES = {"easy": 5, "medium": 4, "hard": 3}
CROSSMATH_MAX_RESULT = 99

# ── Nonogram: difficulty → list of sizes. Density = target fill ratio. ───────
# Densities chosen so every size reliably yields UNIQUE, fully line-solvable
# puzzles (no guessing). Large grids need higher fill because line-solving
# relies on overlap deductions from large blocks; difficulty comes from size.
NONOGRAM_SIZES = {"easy": [5, 10], "medium": [15, 20], "hard": [25, 30]}
NONOGRAM_DENSITY = {"easy": 0.55, "medium": 0.60, "hard": 0.66}


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
        n = CROSSMATH_N[diff]
        buckets.append(Bucket(
            game="crossmath", difficulty=diff, size=n,
            size_label=f"{n}x{n}",
            params={
                "n": n,
                "blanks": CROSSMATH_BLANKS[diff],
                "max_mistakes": CROSSMATH_MAX_MISTAKES[diff],
                "max_result": CROSSMATH_MAX_RESULT,
            },
        ))

    for diff in ("easy", "medium", "hard"):
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
