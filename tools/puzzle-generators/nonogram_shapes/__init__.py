"""Nonogram shape definitions - pixel art bitmaps for all puzzle titles.

Each sub-module exports a SHAPES dict mapping shape name -> {category, grid}.
Grid is a list of 10 strings of '0'/'1' characters (10x10 canonical size).
"""
from __future__ import annotations


def collect_all_shapes() -> dict:
    """Merge SHAPES dicts from every sub-module into one master dict."""
    merged: dict = {}
    from . import animals, nature, food_objects, fantasy_misc
    for mod in (animals, nature, food_objects, fantasy_misc):
        merged.update(mod.SHAPES)
    return merged
