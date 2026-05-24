"""HashGrid subsystem (Subsystem 6) tests — lifecycle + build/query + determinism."""

from __future__ import annotations

import numpy as np
import pytest

pytest.importorskip("warp")  # common-warp's hard dep; skip cleanly if absent in CI.

import warp as wp

import common_warp

_POINTS = np.array(
    [[0.0, 0.0, 0.0], [0.5, 0.0, 0.0], [1.0, 0.0, 0.0], [5.0, 5.0, 5.0]], dtype=np.float32
)


def _build_grid():
    pts = wp.from_numpy(_POINTS, dtype=wp.vec3)
    hg = common_warp.HashGrid(cell_size=1.0, max_particles=4, device="cpu")
    hg.build(pts)
    return hg


def test_query_before_build_raises() -> None:
    hg = common_warp.HashGrid(cell_size=1.0, max_particles=4, device="cpu")
    with pytest.raises(RuntimeError, match="before build"):
        hg.query_radius(wp.vec3(0.0, 0.0, 0.0), 1.0)


def test_query_radius_finds_neighbors() -> None:
    with wp.ScopedDevice("cpu"):
        hg = _build_grid()
        idx = hg.query_radius(wp.vec3(0.0, 0.0, 0.0), 1.2)
        found = sorted(idx.numpy().tolist())
    assert found == [0, 1, 2]  # the distant point (index 3) is excluded


def test_query_radius_excludes_all_when_far() -> None:
    with wp.ScopedDevice("cpu"):
        hg = _build_grid()
        idx = hg.query_radius(wp.vec3(50.0, 50.0, 50.0), 1.0)
    assert idx.numpy().size == 0


def test_hashgrid_query_is_deterministic() -> None:
    """W-2 mechanism over the HashGrid neighbor query (no RNG; must be bit-stable)."""
    common_warp.set_warp_deterministic(42, device="cpu")

    def _run():
        with wp.ScopedDevice("cpu"):
            hg = _build_grid()
            idx = hg.query_radius(wp.vec3(0.0, 0.0, 0.0), 1.2)
            return np.sort(idx.numpy())

    common_warp.assert_deterministic_run(_run, n_runs=3)
