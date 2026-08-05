"""Generate the gold nonogram easy dataset from hand-authored SVGs.

Pipeline: SVG shapes -> sharp rasterizer (svg_to_grid.js) -> rasterized.json
(10x10 binary grids) -> this script builds clues, enforces line-solvability
(unique solution, no guessing), density band [0.20, 0.40], no duplicate grids,
and writes:

  * shared/src/data/nonogram/easy-gold.json  (the 50 gold puzzles)
  * gold_report.json                          (per-shape quality report)
  * previews/                                 (human review sheet)

Records are never force-counted: any shape failing a check is reported and the
dataset is written only if all 50 pass. Visual corrections happen by re-editing
the SVG source and re-generating, never by patching matrices here.

Usage:
    cd tools/puzzle-generators
    python generate_easy_gold.py
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from puzzlegen.nonogram.line_solver import clue_from_line, is_line_solvable

SIZE = 10
DENSITY_MIN = 0.20
DENSITY_MAX = 0.40
DEFAULT_OUT = HERE.parent.parent / "shared" / "src" / "data" / "nonogram" / "easy-gold.json"
RASTERIZED = HERE / "rasterized.json"
REPORT_OUT = HERE / "gold_report.json"
PREVIEW_DIR = HERE / "previews"


def content_hash(sol: str, size: int) -> str:
    payload = f"nonogram:{size}:{sol}"
    return hashlib.sha256(payload.encode()).hexdigest()


def puzzle_id(h: str) -> str:
    return f"nonogram-10x10-easy-{h[:8]}"


def fill_density(sol: str) -> float:
    return sol.count("1") / (SIZE * SIZE)


def mirror_score(sol: str) -> float:
    """Fraction of cells matching their left-right mirror (0..1)."""
    total = SIZE * SIZE
    same = 0
    for r in range(SIZE):
        for c in range(SIZE):
            if sol[r * SIZE + c] == sol[r * SIZE + (SIZE - 1 - c)]:
                same += 1
    return same / total


def to_grid(sol: str) -> list[list[int]]:
    return [[int(sol[r * SIZE + c]) for c in range(SIZE)] for r in range(SIZE)]


def quality_score(grid: list[list[int]], density: float) -> float:
    """Higher = better for easy play: symmetry + density near sweet spot 0.29."""
    return mirror_score("".join(str(v) for row in grid for v in row)) + 0.5 * (1.0 - abs(density - 0.29))


def make_record(shape: dict) -> dict:
    sol = shape["solution"]
    h = content_hash(sol, SIZE)
    grid = to_grid(sol)
    row_clues = [clue_from_line(grid[r]) for r in range(SIZE)]
    col_clues = [clue_from_line([grid[r][c] for r in range(SIZE)]) for c in range(SIZE)]
    density = fill_density(sol)
    return {
        "id": puzzle_id(h),
        "title": shape["title"],
        "category": shape["category"],
        "sourceSvg": shape["sourceSvg"],
        "solution": sol,
        "sol": sol,  # ecosystem alias (validator / index.ts / seeder read `sol`)
        "rowClues": row_clues,
        "columnClues": col_clues,
        "difficulty": "easy",
        "size": SIZE,
        "qualityScore": round(quality_score(grid, density), 4),
        "_hash": h,
        "uniqueSolution": True,
        "fillDensity": round(density, 3),
        "estimatedTime": int(SIZE * SIZE * 3),
    }


def render_preview(sol: str, out: Path, scale: int = 24) -> None:
    img = Image.new("RGB", (SIZE * scale, SIZE * scale), "white")
    d = ImageDraw.Draw(img)
    for r in range(SIZE):
        for c in range(SIZE):
            if sol[r * SIZE + c] == "1":
                d.rectangle([c * scale, r * scale, (c + 1) * scale - 1, (r + 1) * scale - 1], fill="black")
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out)


def render_sheet(previews: list[tuple[str, str, str]], out: Path, cols: int = 5, scale: int = 16) -> None:
    """Render a labeled contact sheet of every shape for human review."""
    per_cell = SIZE * scale
    rows = (len(previews) + cols - 1) // cols
    margin = 8
    label_h = 20
    img = Image.new(
        "RGB",
        (cols * per_cell + (cols + 1) * margin, rows * (per_cell + label_h) + (rows + 1) * margin + label_h),
        "white",
    )
    d = ImageDraw.Draw(img)
    for i, (pid, title, sol) in enumerate(previews):
        x = margin + (i % cols) * (per_cell + margin)
        y = margin + label_h + (i // cols) * (per_cell + label_h + margin)
        d.text((x, y - label_h + 4), pid, fill="black")
        for r in range(SIZE):
            for c in range(SIZE):
                if sol[r * SIZE + c] == "1":
                    d.rectangle(
                        [x + c * scale, y + r * scale, x + (c + 1) * scale - 1, y + (r + 1) * scale - 1],
                        fill="black",
                    )
    out.parent.mkdir(parents=True, exist_ok=True)
    img.save(out)


def render_html_sheet(previews: list[tuple[str, str, str, str]], out: Path) -> None:
    cells = []
    for pid, title, category, sol in previews:
        rects = []
        for r in range(SIZE):
            for c in range(SIZE):
                if sol[r * SIZE + c] == "1":
                    rects.append(f'<div style="position:absolute;left:{c * 10}px;top:{r * 10}px;width:10px;height:10px;background:#000"></div>')
        cells.append(
            f'<div style="border:1px solid #ddd;padding:6px;display:flex;gap:8px;align-items:center;">'
            f'<div style="position:relative;width:100px;height:100px;background:#fff;flex:none">{"" .join(rects)}</div>'
            f'<div><b>{pid}</b><br/>{title}<br/><span style="color:#888">{category}</span></div></div>'
        )
    html = (
        '<html><head><meta charset="utf-8"/><title>Gold nonogram review</title></head>'
        f'<body style="font-family:sans-serif;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px;padding:12px">'
        f'{"".join(cells)}</body></html>'
    )
    out.write_text(html, encoding="utf-8")


def main() -> int:
    rows = json.loads(RASTERIZED.read_text(encoding="utf-8"))
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
        density = fill_density(sol)
        reasons = []
        if not (DENSITY_MIN <= density <= DENSITY_MAX):
            reasons.append(f"density {density:.3f} outside [{DENSITY_MIN}, {DENSITY_MAX}]")
        if set(sol) - {"0", "1"}:
            reasons.append("solution contains non-0/1 chars")
        grid = to_grid(sol)
        if not is_line_solvable(grid):
            reasons.append("not line-solvable (no unique solution)")
        if sol in grid_sols:
            reasons.append("duplicate grid")
        grid_sols.add(sol)

        report["results"]["fillDensity"] = round(density, 3)
        report["results"]["lineSolvable"] = is_line_solvable(grid)
        report["results"]["symmetric"] = round(mirror_score(sol), 3)

        if reasons:
            report["results"]["status"] = "rejected"
            report["results"]["reasons"] = reasons
            rejected.append(report)
            continue

        record = make_record(shape)
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

    out = DEFAULT_OUT
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(accepted, separators=(",", ":")), encoding="utf-8")

    REPORT_OUT.write_text(json.dumps({k: v["results"] for k, v in enumerate(rejected)}, indent=2), encoding="utf-8")
    full_report = {
        "accepted": len(accepted),
        "rejected": rejected,
        "densityRange": [min(r["fillDensity"] for r in accepted), max(r["fillDensity"] for r in accepted)],
        "records": [
            {"id": r["id"], "title": r["title"], "category": r["category"], "fillDensity": r["fillDensity"],
             "qualityScore": r["qualityScore"]}
            for r in accepted
        ],
    }
    REPORT_OUT.write_text(json.dumps(full_report, indent=2), encoding="utf-8")

    previews = [(r["id"], r["title"], r["sol"]) for r in accepted]
    pasted_pngs = []
    for r in accepted:
        png = PREVIEW_DIR / f"{r['id']}.png"
        render_preview(r["sol"], png)
        pasted_pngs.append(png)
    render_sheet(previews, PREVIEW_DIR / "sheet.png")
    render_html_sheet([(r["id"], r["title"], r["category"], r["sol"]) for r in accepted], PREVIEW_DIR / "index.html")

    cats: dict[str, int] = {}
    for r in accepted:
        cats[r["category"]] = cats.get(r["category"], 0) + 1
    dens = [r["fillDensity"] for r in accepted]
    print(f"Wrote {len(accepted)} puzzles -> {out}")
    print(f"Category distribution: {cats}")
    print(f"fillDensity range: {min(dens):.3f} - {max(dens):.3f}")
    print(f"Preview: {PREVIEW_DIR / 'index.html'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())