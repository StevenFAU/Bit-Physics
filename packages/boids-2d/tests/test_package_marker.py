"""Smoke test for the boids-2d Python workspace marker."""

from __future__ import annotations

import boids_2d


def test_package_imports() -> None:
    assert boids_2d.__all__ == []
