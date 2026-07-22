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

# ── Name pool for procedurally generated puzzles ────────────────────────────
# Each entry: (title, category). Names are assigned by index modulo pool size
# so they distribute evenly across all generated puzzles within a difficulty.
NAME_POOL: list[tuple[str, str]] = [
    ("Sunset", "nature"), ("Rainbow", "nature"), ("Waterfall", "nature"), ("Blossom", "nature"),
    ("Garden", "nature"), ("Meadow", "nature"), ("Forest", "nature"), ("Petal", "nature"),
    ("Horizon", "nature"), ("Canyon", "nature"), ("Glacier", "nature"), ("Oasis", "nature"),
    ("Thunder", "weather"), ("Lightning", "weather"), ("Raindrop", "weather"), ("Snowflake", "weather"),
    ("Tornado", "weather"), ("Monsoon", "weather"), ("Blizzard", "weather"), ("Sunbeam", "weather"),
    ("Comet", "space"), ("Nebula", "space"), ("Galaxy", "space"), ("Orbit", "space"),
    ("Eclipse", "space"), ("Asteroid", "space"), ("Satellite", "space"), ("Constellation", "space"),
    ("Crescent", "space"), ("Supernova", "space"), ("Pulsar", "space"), ("Quasar", "space"),
    ("Dolphin", "animals"), ("Penguin", "animals"), ("Octopus", "animals"), ("Butterfly", "animals"),
    ("Dragonfly", "animals"), ("Ladybug", "animals"), ("Firefly", "animals"), ("Seahorse", "animals"),
    ("Jellyfish", "animals"), ("Starfish", "animals"), ("Lobster", "animals"), ("Crab", "animals"),
    ("Rabbit", "animals"), ("Squirrel", "animals"), ("Hedgehog", "animals"), ("Raccoon", "animals"),
    ("Beaver", "animals"), ("Otter", "animals"), ("Fox", "animals"), ("Wolf", "animals"),
    ("Bear", "animals"), ("Panda", "animals"), ("Koala", "animals"), ("Sloth", "animals"),
    ("Deer", "animals"), ("Moose", "animals"), ("Bison", "animals"), ("Gazelle", "animals"),
    ("Eagle", "animals"), ("Hawk", "animals"), ("Owl", "animals"), ("Parrot", "animals"),
    ("Flamingo", "animals"), ("Peacock", "animals"), ("Swan", "animals"), ("Robin", "animals"),
    ("Hummingbird", "animals"), ("Woodpecker", "animals"), ("Kingfisher", "animals"), ("Pelican", "animals"),
    ("Turtle", "animals"), ("Snake", "animals"), ("Lizard", "animals"), ("Chameleon", "animals"),
    ("Gecko", "animals"), ("Iguana", "animals"), ("Crocodile", "animals"), ("Salamander", "animals"),
    ("Whale", "animals"), ("Shark", "animals"), ("Seal", "animals"), ("Walrus", "animals"),
    ("Pufferfish", "animals"), ("Angelfish", "animals"), ("Clownfish", "animals"), ("Manta ray", "animals"),
    ("Hamster", "animals"), ("Gerbil", "animals"), ("Chinchilla", "animals"), ("Ferret", "animals"),
    ("Horse", "animals"), ("Zebra", "animals"), ("Donkey", "animals"), ("Camel", "animals"),
    ("Llama", "animals"), ("Alpaca", "animals"), ("Goat", "animals"), ("Sheep", "animals"),
    ("Cow", "animals"), ("Pig", "animals"), ("Chicken", "animals"), ("Duck", "animals"),
    ("Goose", "animals"), ("Turkey", "animals"), ("Peacock", "animals"), ("Pheasant", "animals"),
    ("Lion", "animals"), ("Tiger", "animals"), ("Leopard", "animals"), ("Jaguar", "animals"),
    ("Panther", "animals"), ("Cheetah", "animals"), ("Lynx", "animals"), ("Bobcat", "animals"),
    ("Gorilla", "animals"), ("Orangutan", "animals"), ("Chimpanzee", "animals"), ("Gibbon", "animals"),
    ("Kangaroo", "animals"), ("Wallaby", "animals"), ("Wombat", "animals"), ("Platypus", "animals"),
    ("Hippo", "animals"), ("Rhino", "animals"), ("Elephant", "animals"), ("Giraffe", "animals"),
    ("Antelope", "animals"), ("Buffalo", "animals"), ("Yak", "animals"), ("Ox", "animals"),
    ("Spider", "animals"), ("Scorpion", "animals"), ("Ant", "animals"), ("Bee", "animals"),
    ("Mosquito", "animals"), ("Wasp", "animals"), ("Beetle", "animals"), ("Caterpillar", "animals"),
    ("Coral", "nature"), ("Pebble", "nature"), ("Boulder", "nature"), ("Cliff", "nature"),
    ("Cave", "nature"), ("Dune", "nature"), ("Geyser", "nature"), ("Lagoon", "nature"),
    ("Arctic", "nature"), ("Tropic", "nature"), ("Savanna", "nature"), ("Taiga", "nature"),
    ("Tulip", "nature"), ("Daisy", "nature"), ("Lily", "nature"), ("Rose", "nature"),
    ("Lavender", "nature"), ("Orchid", "nature"), ("Lotus", "nature"), ("Ivy", "nature"),
    ("Maple", "nature"), ("Oak", "nature"), ("Pine", "nature"), ("Willow", "nature"),
    ("Fern", "nature"), ("Moss", "nature"), ("Cactus", "nature"), ("Bamboo", "nature"),
    ("Pizza", "food"), ("Burger", "food"), ("Taco", "food"), ("Sushi", "food"),
    ("Ramen", "food"), ("Curry", "food"), ("Stew", "food"), ("Soup", "food"),
    ("Salad", "food"), ("Bread", "food"), ("Croissant", "food"), ("Bagel", "food"),
    ("Pancake", "food"), ("Waffle", "food"), ("Muffin", "food"), ("Donut", "food"),
    ("Cookie", "food"), ("Brownie", "food"), ("Cupcake", "food"), ("Pie", "food"),
    ("Cheese", "food"), ("Yogurt", "food"), ("Ice cream", "food"), ("Popsicle", "food"),
    ("Grape", "food"), ("Banana", "food"), ("Orange", "food"), ("Cherry", "food"),
    ("Strawberry", "food"), ("Blueberry", "food"), ("Raspberry", "food"), ("Mango", "food"),
    ("Peach", "food"), ("Pear", "food"), ("Melon", "food"), ("Kiwi", "food"),
    ("Lemon", "food"), ("Lime", "food"), ("Coconut", "food"), ("Avocado", "food"),
    ("Popcorn", "food"), ("Candy", "food"), ("Lollipop", "food"), ("Chocolate", "food"),
    ("Nachos", "food"), ("Fries", "food"), ("Hot dog", "food"), ("Sandwich", "food"),
    ("Bacon", "food"), ("Egg", "food"), ("Toast", "food"), ("Cereal", "food"),
    ("Key", "objects"), ("Lamp", "objects"), ("Clock", "objects"), ("Mirror", "objects"),
    ("Candle", "objects"), ("Vase", "objects"), ("Basket", "objects"), ("Bottle", "objects"),
    ("Cup", "objects"), ("Plate", "objects"), ("Bowl", "objects"), ("Fork", "objects"),
    ("Spoon", "objects"), ("Knife", "objects"), ("Scissors", "objects"), ("Needle", "objects"),
    ("Hammer", "objects"), ("Saw", "objects"), ("Wrench", "objects"), ("Screwdriver", "objects"),
    ("Ladder", "objects"), ("Bucket", "objects"), ("Brush", "objects"), ("Comb", "objects"),
    ("Umbrella", "objects"), ("Wallet", "objects"), ("Purse", "objects"), ("Backpack", "objects"),
    ("Book", "objects"), ("Notebook", "objects"), ("Pen", "objects"), ("Pencil", "objects"),
    ("Ruler", "objects"), ("Compass", "objects"), ("Globe", "objects"), ("Map", "objects"),
    ("Camera", "objects"), ("Binoculars", "objects"), ("Magnifier", "objects"), ("Microscope", "objects"),
    ("Telescope", "objects"), ("Scale", "objects"), ("Balance", "objects"), ("Anvil", "objects"),
    ("Bell", "objects"), ("Flag", "objects"), ("Crown", "objects"), ("Mask", "objects"),
    ("Ring", "objects"), ("Necklace", "objects"), ("Bracelet", "objects"), ("Earring", "objects"),
    ("Arrow", "symbols"), ("Shield", "symbols"), ("Medal", "symbols"), ("Trophy", "symbols"),
    ("Anchor", "symbols"), ("Badge", "symbols"), ("Seal", "symbols"), ("Emblem", "symbols"),
    ("Feather", "symbols"), ("Flame", "symbols"), ("Wing", "symbols"), ("Horn", "symbols"),
    ("Dragon", "fantasy"), ("Unicorn", "fantasy"), ("Phoenix", "fantasy"), ("Griffin", "fantasy"),
    ("Pegasus", "fantasy"), ("Centaur", "fantasy"), ("Minotaur", "fantasy"), ("Cyclops", "fantasy"),
    ("Fairy", "fantasy"), ("Elf", "fantasy"), ("Dwarf", "fantasy"), ("Gnome", "fantasy"),
    ("Wizard", "fantasy"), ("Witch", "fantasy"), ("Sorcerer", "fantasy"), ("Alchemist", "fantasy"),
    ("Knight", "fantasy"), ("Paladin", "fantasy"), ("Rogue", "fantasy"), ("Archer", "fantasy"),
    ("Castle", "fantasy"), ("Tower", "fantasy"), ("Fortress", "fantasy"), ("Citadel", "fantasy"),
    ("Crystal", "fantasy"), ("Gem", "fantasy"), ("Amulet", "fantasy"), ("Potion", "fantasy"),
    ("Scroll", "fantasy"), ("Rune", "fantasy"), ("Spell", "fantasy"), ("Wand", "fantasy"),
    ("Goblin", "fantasy"), ("Troll", "fantasy"), ("Ogre", "fantasy"), ("Giant", "fantasy"),
    ("Mermaid", "fantasy"), ("Nymph", "fantasy"), ("Sprite", "fantasy"), ("Imp", "fantasy"),
    ("Rocket", "technology"), ("Robot", "technology"), ("Drone", "technology"), ("Laser", "technology"),
    ("Satellite", "technology"), ("Telescope", "technology"), ("Laptop", "technology"), ("Tablet", "technology"),
    ("Phone", "technology"), ("Watch", "technology"), ("Headphones", "technology"), ("Speaker", "technology"),
    ("Battery", "technology"), ("Circuit", "technology"), ("Antenna", "technology"), ("Radar", "technology"),
    ("Turbine", "technology"), ("Engine", "technology"), ("Piston", "technology"), ("Gear", "technology"),
    ("Football", "sports"), ("Basketball", "sports"), ("Baseball", "sports"), ("Tennis", "sports"),
    ("Soccer", "sports"), ("Volleyball", "sports"), ("Hockey", "sports"), ("Golf", "sports"),
    ("Bowling", "sports"), ("Boxing", "sports"), ("Fencing", "sports"), ("Wrestling", "sports"),
    ("Rugby", "sports"), ("Cricket", "sports"), ("Badminton", "sports"), ("Table tennis", "sports"),
    ("Skateboard", "sports"), ("Surfboard", "sports"), ("Snowboard", "sports"), ("Ski", "sports"),
    ("Bicycle", "sports"), ("Scooter", "sports"), ("Rollerblade", "sports"), ("Kite", "sports"),
    ("Car", "transport"), ("Bus", "transport"), ("Train", "transport"), ("Plane", "transport"),
    ("Helicopter", "transport"), ("Boat", "transport"), ("Ship", "transport"), ("Submarine", "transport"),
    ("Truck", "transport"), ("Van", "transport"), ("Tractor", "transport"), ("Rickshaw", "transport"),
    ("Canoe", "transport"), ("Kayak", "transport"), ("Raft", "transport"), ("Sailboat", "transport"),
    ("Guitar", "music"), ("Piano", "music"), ("Drum", "music"), ("Violin", "music"),
    ("Flute", "music"), ("Trumpet", "music"), ("Saxophone", "music"), ("Harp", "music"),
    ("Microphone", "music"), ("Headphones", "music"), ("Note", "music"), ("Speaker", "music"),
    ("Santa", "holidays"), ("Wreath", "holidays"), ("Candle", "holidays"), ("Bells", "holidays"),
    ("Pumpkin", "holidays"), ("Bat", "holidays"), ("Skull", "holidays"), ("Spiderweb", "holidays"),
    ("Egg", "holidays"), ("Bunny", "holidays"), ("Chick", "holidays"), ("Fireworks", "holidays"),
    ("Hat", "clothing"), ("Shirt", "clothing"), ("Shoe", "clothing"), ("Boot", "clothing"),
    ("Sock", "clothing"), ("Glove", "clothing"), ("Scarf", "clothing"), ("Belt", "clothing"),
    ("Dress", "clothing"), ("Skirt", "clothing"), ("Jacket", "clothing"), ("Coat", "clothing"),
    ("House", "buildings"), ("Barn", "buildings"), ("Shed", "buildings"), ("Lighthouse", "buildings"),
    ("Windmill", "buildings"), ("Church", "buildings"), ("Temple", "buildings"), ("Pagoda", "buildings"),
    ("Pyramid", "buildings"), ("Colosseum", "buildings"), ("Arch", "buildings"), ("Bridge", "buildings"),
    ("Mountain", "geography"), ("Volcano", "geography"), ("Island", "geography"), ("Peninsula", "geography"),
    ("Valley", "geography"), ("River", "geography"), ("Lake", "geography"), ("Ocean", "geography"),
    ("Desert", "geography"), ("Jungle", "geography"), ("Swamp", "geography"), ("Reef", "geography"),
    ("Spiral", "abstract"), ("Mosaic", "abstract"), ("Maze", "abstract"), ("Labyrinth", "abstract"),
    ("Kaleidoscope", "abstract"), ("Mandala", "abstract"), ("Tessellation", "abstract"), ("Fractal", "abstract"),
    ("Tide", "nature"), ("Mist", "weather"), ("Frost", "weather"), ("Hail", "weather"),
    ("Dew", "nature"), ("Breeze", "weather"), ("Gust", "weather"), ("Tempest", "weather"),
    ("Otter", "animals"), ("Badger", "animals"), ("Weasel", "animals"), ("Mole", "animals"),
    ("Hedgehog", "animals"), ("Porcupine", "animals"), ("Armadillo", "animals"), ("Skunk", "animals"),
    ("Parakeet", "animals"), ("Canary", "animals"), ("Finch", "animals"), ("Sparrow", "animals"),
    ("Crow", "animals"), ("Raven", "animals"), ("Magpie", "animals"), ("Jay", "animals"),
    ("Penguin", "animals"), ("Puffin", "animals"), ("Albatross", "animals"), ("Seagull", "animals"),
    ("Toad", "animals"), ("Frog", "animals"), ("Newt", "animals"), ("Axolotl", "animals"),
    ("Caterpillar", "animals"), ("Cocoon", "animals"), ("Chrysalis", "animals"), ("Silkworm", "animals"),
    ("Sword", "objects"), ("Axe", "objects"), ("Spear", "objects"), ("Bow", "objects"),
    ("Cannon", "objects"), ("Musket", "objects"), ("Saber", "objects"), ("Lance", "objects"),
    ("Lantern", "objects"), ("Torch", "objects"), ("Bonfire", "objects"), ("Campfire", "objects"),
    ("Fountain", "objects"), ("Well", "objects"), ("Statue", "objects"), ("Monument", "objects"),
    ("Chess", "objects"), ("Dice", "objects"), ("Puzzle", "objects"), ("Domino", "objects"),
    ("Marble", "objects"), ("Top", "objects"), ("Kite", "objects"), ("Yo-yo", "objects"),
]

assert len(NAME_POOL) > 100, "NAME_POOL must have at least 100 entries"


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
            name_entry = NAME_POOL[produced % len(NAME_POOL)]
            title = name_entry[0]
            category = name_entry[1]
            existing.append(_make_record(bucket, fields, h, title, category))
            produced += 1

    out_dir.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(existing, separators=(",", ":")), encoding="utf-8")
    print(f"  [{difficulty}] wrote {produced} -> {path.name}", flush=True)
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
