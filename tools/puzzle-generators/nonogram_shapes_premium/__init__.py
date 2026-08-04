"""Nonogram premium shape definitions - NEWLY AUTHORED pixel art bitmaps.

This library is the shape-first source for the easy-premium 10x10 dataset.
Each sub-module exports a SHAPES dict mapping shape name -> {category, grid}.
Grid is a list of 10 strings of '0'/'1' characters (10x10 canonical size).

Authoring SLA: recognizable human-readable name matching the picture; grid is
10x10 0/1; fully connected (one main blob); no empty rows/columns; bounding
box >= 40% of the grid; prefers centered / axial symmetry.

Validate with: py check_premium_shapes.py
"""
from __future__ import annotations


def collect_all_shapes() -> dict:
    """Merge SHAPES dicts from every sub-module into one master dict."""
    merged: dict = {}
    from . import animals, nature, food, objects, space, vehicles, symbols, characters
    for mod in (animals, nature, food, objects, space, vehicles, symbols, characters):
        merged.update(mod.SHAPES)
    return merged
