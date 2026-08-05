"""Generate gold nonogram datasets from hand-authored SVGs.

Pipeline: SVG shapes -> sharp rasterizer (svg_to_grid.js) -> rasterized.json
(NxN binary grids) -> this script builds clues, enforces line-solvability
(unique solution, no guessing), a density band, no duplicate grids, and writes:

  * shared/src/data/nonogram/<difficulty>-gold.json  (the gold puzzles)
  * gold_report.json                                  (per-shape quality report)
  * previews/                                         (human review sheet)

Records are never force-counted: any shape failing a check is reported and the
dataset is written only if all shapes pass. Visual corrections happen by
re-editing the SVG source and re-generating, never by patching matrices here.

Usage:
    cd tools/puzzle-generators
    python generate_gold.py                                        # easy 10x10 defaults
    python generate_gold.py --size 15 --difficulty medium \
        --density-min 0.25 --density-max 0.50 --density-target 0.35 \
        --input rasterized-medium-15.json --output ../shared/src/data/nonogram/medium-gold.json
    python generate_gold.py --size 20 --difficulty hard \
        --density-min 0.30 --density-max 0.55 --density-target 0.42 \
        --input rasterized-hard-20.json --output ../shared/src/data/nonogram/hard-gold.json
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from puzzlegen.nonogram.line_solver import clue_from_line, is_line_solvable


def content_hash(sol: str, size: int) -> str:
    payload = f"nonogram:{size}:{sol}"
    return hashlib.sha256(payload.encode()).hexdigest()


def puzzle_id(size: int, difficulty: str, h: str) -> str:
    return f"nonogram-{size}x{size}-{difficulty}-{h[:8]}"


def fill_density(sol: str, size: int) -> float:
    return sol.count("1") / (size * size)


def mirror_score(sol: str, size: int) -> float:
    """Fraction of cells matching their left-right mirror (0..1)."""
    total = size * size
    same = 0
    for r in range(size):
        for c in range(size):
            if sol[r * size + c] == sol[r * size + (size - 1 - c)]:
                same += 1
    return same / total


def to_grid(sol: str, size: int) -> list[list[int]]:
    return [[int(sol[r * size + c]) for c in range(size)] for r in range(size)]


def quality_score(grid: list[list[int]], density: float, size: int, target: float) -> float:
    """Higher = better for play: symmetry + density near the difficulty sweet spot."""
    flat = "".join(str(v) for row in grid for v in row)
    return mirror_score(flat, size) + 0.5 * (1.0 - abs(density - target))


def make_record(shape: dict, size: int, difficulty: str, target: float) -> dict:
    sol = shape["solution"]
    h = content_hash(sol, size)
    grid = to_grid(sol, size)
    row_clues = [clue_from_line(grid[r]) for r in range(size)]
    col_clues = [clue_from_line([grid[r][c] for r in range(size)]) for c in range(size)]
    density = fill_density(sol, size)
    return {
        "id": puzzle_id(size, difficulty, h),
        "title": shape["title"],
        "category": shape["category"],
        "sourceSvg": shape["sourceSvg"],
        "solution": sol,
        "sol": sol,  # ecosystem alias (validator / index.ts / seeder read `sol`)
        "rowClues": row_clues,
        "columnClues": col_clues,
        "difficulty": difficulty,
        "size": size,
        "qualityScore": round(quality_score(grid, density, size, target), 4),
        "_hash": h,
        "uniqueSolution": True,
        "fillDensity": round(density, 3),
        "estimatedTime": int(size * size * 3),
    }


def render_preview(sol: str, size: int, out: Path, scale: int = 24) -> None:
    img = Image.new("RGB", (size * scale, size * scale), "white")
    d = ImageDraw.Draw(img)
    for r in range(size):
        for c in range(size):
            if sol[r * size + c] == "1":
                d.rectangle([c * scale, r * scale, (c + 1) * scale - 1, (r + 1) * scale - 1], fill="black")
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out)


def render_html_sheet(previews: list[tuple[str, str, str, str, int]], out: Path) -> None:
    cells = []
    for pid, title, category, sol, size in previews:
        rects = []
        for r in range(size):
            for c in range(size):
                if sol[r * size + c] == "1":
                    rects.append(f'<div style="position:absolute;left:{c * 10}px;top:{r * 10}px;width:10px;height:10px;background:#000"></div>')
        cells.append(
            f'<div style="border:1px solid #ddd;padding:6px;display:flex;gap:8px;align-items:center;">'
            f'<div style="position:relative;width:{size * 10}px;height:{size * 10}px;background:#fff;flex:none">{"" .join(rects)}</div>'
            f'<div><b>{pid}</b><br/>{title}<br/><span style="color:#888">{category}</span></div></div>'
        )
    html = (
        '<html><head><meta charset="utf-8"/><title>Gold nonogram review</title></head>'
        f'<body style="font-family:sans-serif;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px;padding:12px">'
        f'{"".join(cells)}</body></html>'
    )
    out.write_text(html, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate gold nonogram datasets from rasterized SVG grids.")
    parser.add_argument("--size", type=int, default=10, help="grid size (10/15/20)")
    parser.add_argument("--difficulty", default="easy", help="difficulty label: easy|medium|hard")
    parser.add_argument("--density-min", type=float, default=0.20)
    parser.add_argument("--density-max", type=float, default=0.40)
    parser.add_argument("--density-target", type=float, default=0.29, help="quality-score sweet spot")
    parser.add_argument("--input", default=str(HERE / "rasterized.json"))
    parser.add_argument("--output", default=str(HERE.parent.parent / "shared" / "src" / "data" / "nonogram" / "easy-gold.json"))
    parser.add_argument("--report", default=str(HERE / "gold_report.json"))
    parser.add_argument("--preview-dir", default=str(HERE / "previews"))
    args = parser.parse_args()

    size = args.size
    difficulty = args.difficulty
    dmin, dmax, dtarget = args.density_min, args.density_max, args.density_target

    rows = json.loads(Path(args.input).read_text(encoding="utf-8"))
    shapes = rows["shapes"]
    print(f"Loaded {len(shapes)} rasterized shapes")

    seen_sols: set[str] = set()
    accepted: list[dict] = []
    rejected: list[dict] = []
    grid_sols: set[str] = set()

    for shape in shapes:
        report = {
            "id": shape["id"],
            "sourceSvg": shape["sourceSvg"],
            "title": shape["title"],
            "category": shape["category"],
            "results": {},
        }
        sol = shape["solution"]
        if len(sol) != size * size:
            report["results"]["status"] = "rejected"
            report["results"]["reasons"] = [f"solution length {len(sol)} != {size * size}"]
            rejected.append(report)
            continue
        density = fill_density(sol, size)
        reasons = []
        if not (dmin <= density <= dmax):
            reasons.append(f"density {density:.3f} outside [{dmin}, {dmax}]")
        if set(sol) - {"0", "1"}:
            reasons.append("solution contains non-0/1 chars")
        grid = to_grid(sol, size)
        if not is_line_solvable(grid):
            reasons.append("not line-solvable (no unique solution)")
        if sol in grid_sols:
            reasons.append("duplicate grid")
        grid_sols.add(sol)

        report["results"]["fillDensity"] = round(density, 3)
        report["results"]["lineSolvable"] = is_line_solvable(grid)
        report["results"]["symmetric"] = round(mirror_score(sol, size), 3)

        if reasons:
            report["results"]["status"] = "rejected"
            report["results"]["reasons"] = reasons
            rejected.append(report)
            continue

        record = make_record(shape, size, difficulty, dtarget)
        report["results"]["status"] = "accepted"
        report["results"]["id"] = record["id"]
        report["results"]["qualityScore"] = record["qualityScore"]
        accepted.append(record)
        seen_sols.add(sol)

    print(f"Accepted: {len(accepted)}, Rejected: {len(rejected)}")
    for rep in rejected:
        print(f"  [REJECT] {rep['sourceSvg']}: {rep['results']['reasons']}")

    if rejected:
        print("FAIL: rejected shapes must be fixed by re-editing their SVG sources.")
        return 1

    if len(accepted) != len(shapes):
        print(f"FAIL: expected all {len(shapes)} accepted, got {len(accepted)}")
        return 1

    # Duplicate record-title/id guard.
    ids = [r["id"] for r in accepted]
    if len(set(ids)) != len(ids):
        print("FAIL: duplicate puzzle ids")
        return 1
    titles = [r["title"] for r in accepted]
    if len(set(titles)) != len(titles):
        print("FAIL: duplicate titles")
        return 1

    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(accepted, separators=(",", ":")), encoding="utf-8")

    full_report = {
        "difficulty": difficulty,
        "size": size,
        "accepted": len(accepted),
        "rejected": rejected,
        "densityRange": [min(r["fillDensity"] for r in accepted), max(r["fillDensity"] for r in accepted)],
        "records": [
            {"id": r["id"], "title": r["title"], "category": r["category"], "fillDensity": r["fillDensity"],
             "qualityScore": r["qualityScore"]}
            for r in accepted
        ],
    }
    report_out = Path(args.report)
    report_out.parent.mkdir(parents=True, exist_ok=True)
    report_out.write_text(json.dumps(full_report, indent=2), encoding="utf-8")

    preview_dir = Path(args.preview_dir)
    for r in accepted:
        render_preview(r["sol"], size, preview_dir / f"{r['id']}.png")
    render_html_sheet(
        [(r["id"], r["title"], r["category"], r["sol"], size) for r in accepted],
        preview_dir / "index.html",
    )

    cats: dict[str, int] = {}
    for r in accepted:
        cats[r["category"]] = cats.get(r["category"], 0) + 1
    dens = [r["fillDensity"] for r in accepted]
    print(f"Wrote {len(accepted)} puzzles -> {out}")
    print(f"Category distribution: {cats}")
    print(f"fillDensity range: {min(dens):.3f} - {max(dens):.3f}")
    print(f"Preview: {preview_dir / 'index.html'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
