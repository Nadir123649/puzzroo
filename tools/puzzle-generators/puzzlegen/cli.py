"""Command-line interface: `python -m puzzlegen <game|all> [options]`."""
from __future__ import annotations

import argparse
import sys

from puzzlegen.common.config import DEFAULT_COUNT, DIFFICULTIES, buckets_for
from puzzlegen.common.seeding import seed_bucket

GAME_SIZES = {
    "sudoku": [6, 9],
    "crossmath": [2, 3, 6],
    "nonogram": [5, 10, 15, 20, 25, 30],
}


def _add_common(p: argparse.ArgumentParser, with_size: bool = True) -> None:
    p.add_argument("--difficulty", choices=[*DIFFICULTIES, "all"], default="all")
    if with_size:
        p.add_argument("--size", default="all", help="a specific size, or 'all'")
    p.add_argument("--count", type=int, default=DEFAULT_COUNT,
                   help=f"target puzzles per bucket (default {DEFAULT_COUNT})")
    p.add_argument("--reset", action="store_true", help="wipe matching buckets first")
    p.add_argument("--dry-run", action="store_true", help="generate + validate, do not write to DB")
    p.add_argument("--seed", type=int, default=None, help="RNG seed for reproducibility")
    p.add_argument("--mongo-uri", default=None, help="override MONGO_URI")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="puzzlegen", description="Generate puzzle datasets into MongoDB.")
    sub = parser.add_subparsers(dest="command", required=True)

    p_all = sub.add_parser("all", help="generate every game/difficulty/size bucket")
    _add_common(p_all, with_size=False)

    for game in ("sudoku", "crossmath", "nonogram"):
        p = sub.add_parser(game, help=f"generate {game} puzzles")
        _add_common(p, with_size=(game != "crossmath"))

    return parser


def _resolve_size(args) -> int | None:
    size = getattr(args, "size", "all")
    if size in (None, "all"):
        return None
    try:
        return int(size)
    except ValueError:
        raise SystemExit(f"invalid --size: {size}")


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)

    game = None if args.command == "all" else args.command
    size = _resolve_size(args) if args.command != "crossmath" else None

    if game and game != "all" and size is not None and size not in GAME_SIZES[game]:
        raise SystemExit(f"{game} does not support size {size}; valid: {GAME_SIZES[game]}")

    buckets = buckets_for(game, args.difficulty, size)
    if not buckets:
        raise SystemExit("no buckets matched the given filters.")

    mode = "DRY-RUN" if args.dry_run else "WRITE"
    print(f"[{mode}] {len(buckets)} bucket(s), target {args.count} each"
          + (" (--reset)" if args.reset else ""))

    results = []
    for b in buckets:
        r = seed_bucket(
            b, args.count,
            reset=args.reset, dry_run=args.dry_run,
            seed=args.seed, mongo_uri=args.mongo_uri,
        )
        results.append(r)
        flag = "" if r.shortfall <= 0 else f"  [!] short {r.shortfall}"
        print(f"  {b.game:<9} {b.size_label:<7} {b.difficulty:<6} "
              f"produced {r.produced:>4}  total {r.total:>4}  attempts {r.attempts:>5}{flag}")

    total_produced = sum(r.produced for r in results)
    total_short = sum(max(0, r.shortfall) for r in results)
    print(f"[{mode}] done. produced {total_produced} new puzzle(s)."
          + (f" shortfall {total_short}." if total_short else ""))
    return 1 if total_short else 0


if __name__ == "__main__":
    sys.exit(main())
