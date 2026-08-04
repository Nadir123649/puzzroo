"""Nonogram shape definitions - dispatcher to the premium library.

The canonical shape source is now nonogram_shapes_premium (QA-verified: 10x10
grids, single connected component, unique grids, line-solvable to a unique
solution). This package remains for backward compatibility with the generator
and tooling; it simply re-exports the premium shapes.
"""
from __future__ import annotations


def collect_all_shapes() -> dict:
    """Merge SHAPES dicts from every premium sub-module into one master dict."""
    from nonogram_shapes_premium import collect_all_shapes as premium_collect
    return premium_collect()
